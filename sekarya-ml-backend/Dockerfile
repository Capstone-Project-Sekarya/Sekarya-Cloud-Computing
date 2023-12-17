FROM python:3.10-slim
WORKDIR /app
ENV PORT 8080
COPY . .
RUN pip install --upgrade pip && pip install -r library.txt
EXPOSE 8080
CMD ["python", "main.py"]