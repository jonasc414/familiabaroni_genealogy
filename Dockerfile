FROM python:3.11-slim

# Cria diretório de trabalho no container
WORKDIR /app

# Copia todos os arquivos do projeto para dentro do container
COPY . .

# Instala dependências
RUN pip install --no-cache-dir -r requirements.txt

# Cria banco SQLite (evita erro de banco na primeira execução)
RUN mkdir -p /app/src/database && touch /app/src/database/app.db

# Expõe a porta que o Gunicorn vai usar
EXPOSE 8000

# Comando para rodar o app Flask via Gunicorn
CMD ["gunicorn", "-b", "0.0.0.0:8000", "src.main:app"]
