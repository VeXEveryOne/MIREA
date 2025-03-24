// Класс Node представляет узел связного списка
class Node<T> {
    T data;  // Данные, хранимые в узле
    Node<T> next;  // Указатель на следующий узел

    // Конструктор узла
    public Node(T data) {
        this.data = data;
        this.next = null;
    }
}

// Класс Stack реализует стек на основе связного списка
public class Stack<T> {
    private Node<T> top;  // Указатель на верхний элемент стека

    // Конструктор стека
    public Stack() {
        top = null;
    }

    // Метод для добавления элемента в стек
    public void push(T data) {
        Node<T> newNode = new Node<>(data);  // Создаем новый узел
        newNode.next = top;  // Новый узел указывает на текущий верхний элемент
        top = newNode;  // Новый узел становится верхним элементом
    }

    // Метод для удаления верхнего элемента из стека
    public T pop() {
        if (top == null) {
            throw new IllegalStateException("Stack is empty");
        }
        T data = top.data;  // Сохраняем данные верхнего элемента
        top = top.next;  // Перемещаем указатель на следующий элемент
        return data;  // Возвращаем данные удаленного элемента
    }

    // Метод для получения верхнего элемента стека без его удаления
    public T peek() {
        if (top == null) {
            throw new IllegalStateException("Stack is empty");
        }
        return top.data;  // Возвращаем данные верхнего элемента
    }

    // Метод для проверки, пуст ли стек
    public boolean isEmpty() {
        return top == null;  // Стек пуст, если верхний элемент равен null
    }

    // Метод для печати элементов стека
    public void printStack() {
        if (top == null) {
            System.out.println("Stack is empty");
            return;
        }
        Node<T> current = top;
        while (current != null) {
            System.out.print(current.data + " ");
            current = current.next;
        }
        System.out.println();
    }

    // Пример использования стека
    public static void main(String[] args) {
        Stack<Integer> stack = new Stack<>();

        stack.push(10);
        stack.push(20);
        stack.push(30);

        System.out.println("Stack after pushes:");
        stack.printStack();  // Вывод: 30 20 10

        System.out.println("Peek top element: " + stack.peek());  // Вывод: 30

        System.out.println("Pop top element: " + stack.pop());  // Вывод: 30

        System.out.println("Stack after pop:");
        stack.printStack();  // Вывод: 20 10

        System.out.println("Is stack empty? " + stack.isEmpty());  // Вывод: false

        // Очистим стек
        stack.pop();
        stack.pop();

        System.out.println("Is stack empty after popping all elements? " + stack.isEmpty());  // Вывод: true
    }
}
