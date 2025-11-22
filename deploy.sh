#!/usr/bin/env bash
set -euo pipefail

# Optional: show each command as it's run
# set -x

# Remove old build directories if they exist
rm -rf ./dist
rm -rf ./lambda-dist

# Install dependencies
npm install

# Build the project
npm run build

# Copy build output
cp -r ./dist/src ./lambda-dist
cp ./package.json ./package-lock.json ./lambda-dist

# Install production dependencies in lambda-dist
cd ./lambda-dist
npm install --production

# Deploy with CDK
cd ../infra
npx cdk deploy
