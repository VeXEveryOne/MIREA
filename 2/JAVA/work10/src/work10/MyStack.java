package work10;

import java.util.ArrayList;

public class MyStack {
    private ArrayList<Object> list;

    public MyStack() {
        list = new ArrayList<>();
    }

    public MyStack(MyStack forCopy) {
        list = new ArrayList<>();
        for (Object obj : forCopy.list) {
            list.add(obj);
        }
    }

    public boolean isEmpty() {
        return list.size() == 0;
    }

    public int getSize() {
        return list.size();
    }

    public Object peek() {
        return !list.isEmpty() ? list.get(list.size() - 1) : null;
    }

    public Object pop() {
        return !list.isEmpty() ? list.remove(list.size() - 1) : null;
    }

    public void push(Object obj) {
        list.add(obj);
    }
}