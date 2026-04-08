import sys
import os

with open("flask_check.txt", "w") as f:
    try:
        import flask
        f.write("Flask is installed\n")
    except ImportError:
        f.write("Flask is NOT installed\n")
    
    try:
        import telebot
        f.write("Telebot is installed\n")
    except ImportError:
        f.write("Telebot is NOT installed\n")

    try:
        import docker
        f.write("Docker SDK is installed\n")
    except ImportError:
        f.write("Docker SDK is NOT installed\n")
