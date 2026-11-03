// Post-merge flow: after a merge to main, build the image, deploy it to staging, then smoke-test the deployment.
// Non-main branches skip every stage, so only merges to main do any work.
pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 20, unit: 'MINUTES')
        disableConcurrentBuilds(abortPrevious: true)
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '5'))
    }

    environment {
        CI = 'true'
        IMAGE_REPO = 'ghcr.io/davidlescard/qg-post-merge-staging-jenkins'
        // The staging stack publishes port 3001 on the Docker host; Jenkins reaches the host by this name.
        STAGING_URL = 'http://host.docker.internal:3001'
    }

    stages {
        stage('Prepare') {
            when { branch 'main' }
            steps {
                script {
                    // The version identifies exactly what gets deployed: build number plus commit.
                    env.VERSION = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.take(7)}"
                }
                sh 'pnpm install --frozen-lockfile --filter ai-ci-reference-e2e'
                sh 'pnpm --filter ai-ci-reference-e2e exec playwright install chromium'
            }
        }

        stage('Build image') {
            when { branch 'main' }
            steps {
                sh 'docker build -t "quality-gate-lab:${VERSION}" .'
            }
        }

        stage('Publish image') {
            when { branch 'main' }
            steps {
                withCredentials([usernamePassword(credentialsId: 'ghcr-token', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_PASS')]) {
                    sh '''
                        if [ -z "$GHCR_PASS" ]; then
                            echo "No GHCR token configured; skipping the registry push"
                            exit 0
                        fi
                        echo "$GHCR_PASS" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
                        docker tag "quality-gate-lab:${VERSION}" "${IMAGE_REPO}:${VERSION}"
                        docker tag "quality-gate-lab:${VERSION}" "${IMAGE_REPO}:latest"
                        docker push "${IMAGE_REPO}:${VERSION}"
                        docker push "${IMAGE_REPO}:latest"
                        docker logout ghcr.io
                    '''
                }
            }
        }

        stage('Deploy to staging') {
            when { branch 'main' }
            steps {
                // --wait blocks until the container's health check passes, and fails the stage if it never does.
                sh 'APP_IMAGE="quality-gate-lab:${VERSION}" docker compose -f docker-compose.staging.yml up -d --wait'
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
                    writeFile file: 'deployment.txt', text: "version=${env.VERSION}\nimage=quality-gate-lab:${env.VERSION}\ncommit=${env.GIT_COMMIT}\nurl=http://localhost:3001\nresult=${currentBuild.currentResult}\n"
                    currentBuild.description = "${env.VERSION} to staging: ${currentBuild.currentResult}"
                }
            }
            sh 'docker logs qgl-staging-app-1 > staging.log 2>&1 || true'
            archiveArtifacts artifacts: 'staging.log, deployment.txt, e2e/playwright-report/**, e2e/test-results/**', allowEmptyArchive: true
            cleanWs()
        }
    }
}
