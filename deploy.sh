#!/bin/bash

# Build e deploy
echo "Deploying to GitHub Pages..."

# Crea cartella di build
rm -rf dist
mkdir dist

# Copia i file necessari
cp -r css dist/
cp -r js dist/
cp -r assets dist/
cp index.html dist/
cp login.html dist/

# Deploy su GitHub Pages
git add dist
git commit -m "Update production build"
git push origin main
