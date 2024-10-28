#!/bin/bash

# Aktualisiere System-Pakete
sudo apt-get update
sudo apt-get install -y \
    unzip \
    xvfb \
    libxi6 \
    libgconf-2-4 \
    default-jdk \
    wget \
    curl

# Installiere Google Chrome
wget https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb
sudo apt install -y ./google-chrome-stable_current_amd64.deb
rm google-chrome-stable_current_amd64.deb

# Setze Berechtigungen für Chrome und Selenium Cache
sudo mkdir -p /root/.cache/selenium
sudo chmod -R 777 /root/.cache/selenium

# Installiere Python-Abhängigkeiten
pip install -r requirements.txt

# Erstelle .env Datei falls nicht vorhanden
if [ ! -f .env ]; then
    echo "YOUTUBE_EMAIL=your-email@gmail.com" > .env
    echo "YOUTUBE_PASSWORD=your-password" >> .env
    echo ".env Datei erstellt. Bitte Email und Passwort eintragen!"
fi

# Setze Ausführungsrechte für das Python-Skript
chmod +x update_cookies.py

echo "Installation abgeschlossen!"
echo "Bitte stellen Sie sicher, dass Sie Ihre YouTube-Anmeldedaten in der .env Datei eingetragen haben."