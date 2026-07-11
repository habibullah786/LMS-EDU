#!/bin/bash

cd "$(dirname "$0")"

echo "🚀 Setting up LMS-EDU Laravel Backend..."
echo ""

# Check if composer is installed
if ! command -v composer &> /dev/null; then
    echo "❌ Composer is not installed. Please install Composer first."
    echo "   Visit: https://getcomposer.org/download/"
    exit 1
fi

# Install composer dependencies
echo "📦 Installing Composer dependencies..."
composer install

# Create database directory if it doesn't exist
mkdir -p database

# Run migrations
echo "🗄️  Running migrations..."
php artisan migrate --force

# Seed database with test data
echo "🌱 Seeding database with test data..."
php artisan db:seed --class=EnrollmentSeeder

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "📝 Environment:"
echo "   - Database: SQLite (database/database.sqlite)"
echo "   - URL: http://localhost:8000/api"
echo ""
echo "🚀 To start the development server:"
echo "   php artisan serve"
echo ""
