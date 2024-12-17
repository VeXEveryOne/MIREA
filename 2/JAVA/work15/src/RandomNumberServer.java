import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.util.Random;

public class RandomNumberServer {

    public static void main(String[] args) throws IOException {
        // Создание HTTP-сервера на порту 8080
        HttpServer server = HttpServer.create(new InetSocketAddress(33), 0);
        server.createContext("/notes", new RandomNumberHandler());
        server.setExecutor(null); // Использовать стандартный исполнитель\
        server.start();
        System.out.println("Сервер запущен на http://localhost:33/notes");
        System.out.println("Пример запроса: http://localhost:33/notes?min=1&max=100");
    }

    static class RandomNumberHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            // Проверяем метод запроса
            if ("GET".equalsIgnoreCase(exchange.getRequestMethod())) {
                // Парсим параметры из строки запроса
                String query = exchange.getRequestURI().getQuery();
                if (query == null || !query.contains("min") || !query.contains("max")) {
                    sendResponse(exchange, 400, "Bad Request: Parameters 'min' and 'max' are required.");
                    return;
                }

                try {
                    // Извлекаем параметры min и max
                    String[] params = query.split("&");
                    int min = Integer.parseInt(getParameterValue(params, "min"));
                    int max = Integer.parseInt(getParameterValue(params, "max"));

                    if (min > max) {
                        sendResponse(exchange, 400, "Bad Request: 'min' should be less than or equal to 'max'.");
                        return;
                    }

                    // Генерация случайного числа
                    Random random = new Random();
                    int randomNumber = random.nextInt(max - min + 1) + min;

                    // Отправляем ответ клиенту
                    sendResponse(exchange, 200, "Generated random number: " + randomNumber);
                } catch (NumberFormatException e) {
                    sendResponse(exchange, 400, "Bad Request: 'min' and 'max' should be integers.");
                }
            } else {
                // Метод не поддерживается
                sendResponse(exchange, 405, "Method Not Allowed: Only GET is supported.");
            }
        }

        // Извлекаем значение параметра из строки запроса
        private String getParameterValue(String[] params, String paramName) {
            for (String param : params) {
                if (param.startsWith(paramName + "=")) {
                    return param.split("=")[1];
                }
            }
            return null;
        }

        // Отправка ответа клиенту
        private void sendResponse(HttpExchange exchange, int statusCode, String response) throws IOException {
            exchange.sendResponseHeaders(statusCode, response.getBytes().length);
            OutputStream os = exchange.getResponseBody();
            os.write(response.getBytes());
            os.close();
        }
    }
}
