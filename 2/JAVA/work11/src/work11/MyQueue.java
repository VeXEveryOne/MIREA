package work11;

import java.util.ArrayList;

public class MyQueue {
    public ArrayList<Object> list;

    public MyQueue() {
        list = new ArrayList<>();
    }

    public MyQueue(MyQueue forCopy) {
        list = new ArrayList<>();
        for (Object obj : forCopy.list) {
            list.add(obj);
        }
    }

    public boolean isEmpty() {
        return list.isEmpty();
    }

    public int getSize() {
        return list.size();
    }

    public Object dequeue() {
        return !list.isEmpty() ? list.remove(0) : null; // Удаляет первый элемент и возвращает его
    }

    public void enqueue(Object obj) {
        list.add(obj); // Добавляет элемент в конец очереди
    }
}
