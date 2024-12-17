package work12;

public class Main {
    public static void main(String[] args) {
        GUIFactory factory;

        // Определение платформы
        String osName = System.getProperty("os.name").toLowerCase();
        if (osName.contains("win")) {
            factory = new WinGUIFactory();
        } else if (osName.contains("mac")) {
            factory = new MacGUIFactory();
        } else {
            throw new UnsupportedOperationException("Unsupported platform: " + osName);
        }

        // Создание приложения с использованием выбранной фабрики
        Application app = new Application(factory);
        app.drawUI();
    }
}