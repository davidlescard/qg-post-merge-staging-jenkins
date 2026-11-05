// Post-merge flow: after a merge to main, deploy the image GitHub Actions published to GHCR, then smoke-test it.
// Jenkins never builds the image. It finds it by tag, pins it to a digest, and deploys the digest.
// Non-main branches skip every stage, so only merges to main do any work.
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 25, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }

    environment {
        CI = 'true'
        // Must match IMAGE_REPO in .github/workflows/publish-image.yml. The package is public, so no login is needed.
        IMAGE_REPO = 'ghcr.io/davidlescard/qg-post-merge-staging-jenkins'
        // The staging stack publishes port 3001 on the Docker host; Jenkins reaches the host by this name.
        STAGING_URL = 'http://host.docker.internal:3001'
    }

    stages {
        stage('Prepare') {
            when { branch 'main' }
            steps {
                script {
                    // Same tag the publish workflow computes: <package.json version>-<short commit>.
                    env.APP_VERSION = sh(returnStdout: true, script: 'node -p "require(\'./package.json\').version"').trim()
                    env.IMAGE_TAG = "${env.APP_VERSION}-${env.GIT_COMMIT.take(7)}"
                }
                sh 'pnpm install --frozen-lockfile --filter ai-ci-reference-e2e'
                sh 'pnpm --filter ai-ci-reference-e2e exec playwright install chromium'
            }
        }

        stage('Resolve image') {
            when { branch 'main' }
            steps {
                // The publish workflow may still be running when Jenkins picks up the commit, so wait up to 10 minutes.
                sh '''
                    for attempt in $(seq 1 40); do
                        if docker pull "${IMAGE_REPO}:${IMAGE_TAG}"; then exit 0; fi
                        echo "Waiting for GitHub Actions to publish ${IMAGE_REPO}:${IMAGE_TAG} (attempt $attempt of 40)"
                        sleep 15
                    done
                    echo "${IMAGE_REPO}:${IMAGE_TAG} was not published within 10 minutes" >&2
                    exit 1
                '''
                script {
                    // Tags can be moved; a digest cannot. Everything from here on uses the digest.
                    env.IMAGE_REF = sh(returnStdout: true, script: '''
                        docker image inspect --format '{{range .RepoDigests}}{{println .}}{{end}}' "${IMAGE_REPO}:${IMAGE_TAG}" \
                            | grep "^${IMAGE_REPO}@sha256:" | head -n 1
                    ''').trim()
                    if (!env.IMAGE_REF) {
                        error("Could not resolve a digest for ${env.IMAGE_REPO}:${env.IMAGE_TAG}")
                    }
                    env.IMAGE_DIGEST = env.IMAGE_REF.substring(env.IMAGE_REF.indexOf('@') + 1)

                    // The image must have been built from the commit being deployed.
                    def revision = sh(returnStdout: true, script: '''
                        docker image inspect --format '{{index .Config.Labels "org.opencontainers.image.revision"}}' "${IMAGE_REF}"
                    ''').trim()
                    if (revision != env.GIT_COMMIT) {
                        error("Image revision ${revision} does not match commit ${env.GIT_COMMIT}")
                    }
                    echo "Deploying ${env.IMAGE_REF}"
                }
            }
        }

        stage('Deploy to staging') {
            when { branch 'main' }
            steps {
                // --wait blocks until the container's health check passes, and fails the stage if it never does.
                sh 'APP_IMAGE="${IMAGE_REF}" docker compose -f docker-compose.staging.yml up -d --wait'
            }
        }

        stage('Post-deploy smoke') {
            when { branch 'main' }
            steps {
                sh '''
                    BASE_URL="${STAGING_URL}" \
                    pnpm --filter ai-ci-reference-e2e exec playwright test --grep @post-deploy
                '''
            }
        }
    }

    post {
        always {
            junit allowEmptyResults: true, testResults: 'e2e/test-results/junit.xml'
            script {
                if (env.BRANCH_NAME == 'main') {
                    writeFile file: 'deployment.txt', text: """version=${env.APP_VERSION}
tag=${env.IMAGE_REPO}:${env.IMAGE_TAG}
digest=${env.IMAGE_DIGEST}
image=${env.IMAGE_REF}
commit=${env.GIT_COMMIT}
url=http://localhost:3001
result=${currentBuild.currentResult}
"""
                    currentBuild.description = "${env.IMAGE_TAG} (${env.IMAGE_DIGEST?.take(19)}) to staging: ${currentBuild.currentResult}"
                }
            }
            sh 'docker logs qgl-staging-app-1 > staging.log 2>&1 || true'
            archiveArtifacts artifacts: 'staging.log, deployment.txt, e2e/playwright-report/**, e2e/test-results/**', allowEmptyArchive: true
            cleanWs()
        }
    }
}
