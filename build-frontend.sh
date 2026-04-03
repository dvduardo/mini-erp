#!/bin/bash

# Script para fazer build do frontend na produção do Heroku

echo "Building frontend..."
cd frontend
npm ci  # Usar ci em vez de install para produção
npm run build
cd ..

echo "Frontend built successfully!"
echo "Frontend files are in frontend/dist/"
