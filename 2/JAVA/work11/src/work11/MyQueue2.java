package work11;

import java.util.ArrayList;

public class MyQueue2 extends ArrayList<Object> {
    public boolean isEmpty() {
        return super.isEmpty();
    }

    public int getSize() {
        return super.size();
    }

    public Object dequeue() {
        return !isEmpty() ? super.remove(0) : null; // Удаляет первый элемент и возвращает его
    }

    public void enqueue(Object obj) {
        super.add(obj); // Добавляет элемент в конец очереди
    }
}
