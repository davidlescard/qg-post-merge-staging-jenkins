FROM jenkins/jenkins:lts-jdk21
USER root

# Docker CLI and Compose plugin; they talk to the host daemon through the mounted socket.
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates curl gnupg xz-utils \
 && install -m 0755 -d /etc/apt/keyrings \
 && curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc \
 && chmod a+r /etc/apt/keyrings/docker.asc \
 && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian $(. /etc/os-release && echo $VERSION_CODENAME) stable" > /etc/apt/sources.list.d/docker.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends docker-ce-cli docker-compose-plugin \
 && rm -rf /var/lib/apt/lists/*

ARG NODE_VERSION=24.20.0
ARG PNPM_VERSION=12.14.0
RUN curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz" | tar -xJ -C /usr/local --strip-components=1 \
 && npm install -g "pnpm@${PNPM_VERSION}"

# Operating-system libraries for all three Playwright browsers. The browsers themselves are
# downloaded by the pipeline (and cached in the Jenkins volume) so their version always matches the repo.
ARG PLAYWRIGHT_VERSION=1.64.1
RUN npx -y "playwright@${PLAYWRIGHT_VERSION}" install-deps chromium firefox webkit \
 && rm -rf /var/lib/apt/lists/* /root/.npm

ENV PLAYWRIGHT_BROWSERS_PATH=/var/jenkins_home/pw-browsers \
    JAVA_OPTS="-Djenkins.install.runSetupWizard=false" \
    CASC_JENKINS_CONFIG=/usr/share/jenkins/casc/jenkins.yaml

USER jenkins
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
COPY --chown=jenkins:jenkins casc/jenkins.yaml /usr/share/jenkins/casc/jenkins.yaml

# The compose file runs the container as root so it can use the mounted Docker socket (lab setup).
USER root
