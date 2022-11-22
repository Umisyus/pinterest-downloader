# Specify the base Docker image. You can read more about
# the available images at https://crawlee.dev/docs/guides/docker-images
# You can also use any other image from Docker Hub.
FROM apify/actor-node-playwright-chrome:16 AS builder
USER root
RUN apt-get update && apt-get -y install sudo
# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY --chown=myuser package.json ./

# Install all dependencies. Don't audit to speed up the installation.
#  Install YARN
RUN sudo npm install -g --force yarn
RUN sudo yarn install --silent --no-progress --no-audit --non-interactive

# Next, copy the source files using the user set
# in the base image.
COPY --chown=myuser . ./

# Install all dependencies and build the project.
# Don't audit to speed up the installation.
RUN yarn run build

# Create final image
FROM apify/actor-node-playwright-chrome:16

# Copy only built JS files from builder image
COPY --from=builder --chown=myuser /home/myuser/dist ./dist

# Copy just package.json and package-lock.json
# to speed up the build using Docker layer cache.
COPY --chown=myuser package*.json ./

# Next, copy the remaining files and directories with the source code.
# Since we do this after NPM install, quick build will be really fast
# for most source file changes.
COPY --chown=myuser . ./


# Run the image. If you know you won't need headful browsers,
# you can remove the XVFB start script for a micro perf gain.
CMD ./start_xvfb_and_run_cmd.sh && npm run start:prod --silent
