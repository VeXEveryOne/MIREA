public class LinkedIntList {
    private ListNode front;  // Указатель на первый элемент списка
    private ListNode back;   // Указатель на последний элемент списка

    // Вложенный класс ListNode для узлов списка
    private static class ListNode {
        int data;
        ListNode next;

        ListNode(int data) {
            this.data = data;
            this.next = null;
        }
    }

    // Метод firstLast
    public void firstLast() {
        if (front == null || front.next == null) {
            // Если список пуст или содержит только один элемент, ничего не меняем
            return;
        }

        // Сохраняем первый элемент
        ListNode first = front;

        // Перемещаем указатель front на второй элемент
        front = front.next;

        // Находим последний элемент
        ListNode current = front;
        while (current.next != null) {
            current = current.next;
        }

        // Добавляем первый элемент в конец
        current.next = first;
        first.next = null; // Переопределяем ссылку на следующий элемент, чтобы последний элемент указывал на null
        back = first; // Обновляем указатель на последний элемент
    }

    // Метод для вывода списка (для проверки)
    public void printList() {
        ListNode current = front;
        while (current != null) {
            System.out.print(current.data + " ");
            current = current.next;
        }
        System.out.println();
    }

    // Пример использования
    public static void main(String[] args) {
        LinkedIntList list = new LinkedIntList();

        // Создание списка: [18, 4, 27, 9, 54, 5, 63]
        list.front = new ListNode(18);
        list.front.next = new ListNode(4);
        list.front.next.next = new ListNode(27);
        list.front.next.next.next = new ListNode(9);
        list.front.next.next.next.next = new ListNode(54);
        list.front.next.next.next.next.next = new ListNode(5);
        list.front.next.next.next.next.next.next = new ListNode(63);
        list.back = list.front.next.next.next.next.next.next;

        System.out.println("Before calling firstLast:");
        list.printList(); // Вывод: [18, 4, 27, 9, 54, 5, 63]

        list.firstLast();

        System.out.println("After calling firstLast:");
        list.printList(); // Вывод: [4, 27, 9, 54, 5, 63, 18]
    }
}
