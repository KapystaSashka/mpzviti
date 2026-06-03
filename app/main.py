from app import create_app
app = create_app()
if __name__ == '__main__':
 # Запуск на порту 5000
  app.run(host='0.0.0.0', port=5000, debug=True)