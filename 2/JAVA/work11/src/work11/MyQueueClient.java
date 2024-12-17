package work11;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

public class MyQueueClient extends JFrame {
    private MyQueue queue;
    private JTextArea displayArea;
    private JTextField inputField;

    public MyQueueClient() {
        queue = new MyQueue();

        // Настройка окна
        setTitle("Queue Application");
        setSize(400, 300);
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setLocationRelativeTo(null);

        // Создаем элементы интерфейса
        displayArea = new JTextArea();
        displayArea.setEditable(true);
        JScrollPane scrollPane = new JScrollPane(displayArea);

        inputField = new JTextField(20);
        JButton enqueueButton = new JButton("Enqueue");
        JButton dequeueButton = new JButton("Dequeue");

        // Панель для ввода данных
        JPanel inputPanel = new JPanel();
        inputPanel.add(new JLabel("Enter a line:"));
        inputPanel.add(inputField);
        inputPanel.add(enqueueButton);

        // Панель для кнопок управления
        JPanel controlPanel = new JPanel();
        controlPanel.add(dequeueButton);

        // Добавляем панели на окно
        add(inputPanel, BorderLayout.NORTH);
        add(scrollPane, BorderLayout.CENTER);
        add(controlPanel, BorderLayout.SOUTH);

        // Логика кнопки Enqueue
        enqueueButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                String inputText = inputField.getText();
                if (!inputText.isEmpty()) {
                    queue.enqueue(inputText);
                    inputField.setText("");
                    updateDisplay();
                }
            }
        });

        // Логика кнопки Dequeue
        dequeueButton.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                Object removed = queue.dequeue();
                if (removed != null) {
                    JOptionPane.showMessageDialog(null, "Dequeued: " + removed);
                    updateDisplay();
                } else {
                    JOptionPane.showMessageDialog(null, "Queue is empty.");
                }
            }
        });
    }

    // Метод обновления отображения очереди
    private void updateDisplay() {
        StringBuilder displayText = new StringBuilder("Queue: \n");
        for (Object item : queue.list) {
            displayText.append(item).append("\n");
        }
        displayArea.setText(displayText.toString());
    }

    public static void main(String[] args) {
        SwingUtilities.invokeLater(() -> {
            MyQueueClient client = new MyQueueClient();
            client.setVisible(true);
        });
    }
}
