import java.util.Stack;
import java.util.LinkedList;
import java.util.Queue;

public class QueueProcessor {

    public static void reverseHalf(Queue<Integer> queue) {
        // Используем стек для хранения элементов на нечетных позициях
        Stack<Integer> stack = new Stack<>();

        // Читаем элементы с нечетных позиций и помещаем их в стек
        int size = queue.size();
        for (int i = 0; i < size; i++) {
            Integer current = queue.poll();

            // Если индекс нечетный, сохраняем в стек
            if (i % 2 != 0) {
                stack.push(current);
            } else {
                // Если индекс четный, возвращаем в очередь
                queue.offer(current);
            }
        }

        // Теперь возвращаем элементы из стека обратно в очередь
        for (int i = 0; i < size / 2; i++) {
            Integer element = stack.pop();
            queue.offer(element);
        }
    }

    // Для тестирования метода
    public static void main(String[] args) {
        Queue<Integer> queue = new LinkedList<>();
        queue.offer(1);
        queue.offer(8);
        queue.offer(7);
        queue.offer(2);
        queue.offer(9);
        queue.offer(18);
        queue.offer(12);
        queue.offer(0);

        System.out.println("Before reverseHalf: " + queue);

        reverseHalf(queue);

        System.out.println("After reverseHalf: " + queue);
    }
}
