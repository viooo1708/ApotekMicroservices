FROM php:8.2-cli

WORKDIR /app

# Install system deps
RUN apt-get update && apt-get install -y unzip git

# Install Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY composer.json ./
RUN composer install

COPY . .

EXPOSE 5001

CMD ["php", "-S", "0.0.0.0:5001", "index.php"]
