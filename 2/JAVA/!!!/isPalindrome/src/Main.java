import java.util.*;

public class Main {

    public static boolean isPalindrome(Queue<Integer> q) {
        // Создаем стек для хранения элементов из очереди
        Stack<Integer> stack = new Stack<>();
        // Копируем элементы очереди в стек
        Queue<Integer> originalQueue = new LinkedList<>(q); // Сохраняем исходное состояние очереди

        // Перемещаем элементы из очереди в стек
        while (!q.isEmpty()) {
            stack.push(q.poll());
        }

        // Сравниваем элементы из стека с элементами из исходной очереди
        while (!stack.isEmpty()) {
            if (!stack.pop().equals(originalQueue.poll())) {
                return false;
            }
        }

        // Восстанавливаем очередь, возвращая все элементы обратно
        q.addAll(originalQueue);

        return true;
    }

    public static void main(String[] args) {
        Queue<Integer> q1 = new LinkedList<>(Arrays.asList(3, 8, 17, 9, 17, 8, 3));
        Queue<Integer> q2 = new LinkedList<>(Arrays.asList(3, 8, 17, 9, 4, 17, 8, 3));

        System.out.println(isPalindrome(q1)); // true
        System.out.println(isPalindrome(q2)); // false
    }
}
