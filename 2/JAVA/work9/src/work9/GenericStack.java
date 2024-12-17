package work9;

import java.util.ArrayList;

public class GenericStack<E> extends ArrayList{
    private E[] array;
    private int size;
    private static final int capacity = 10;

    public int getSize() {return size;}

    public GenericStack() {
        array = (E[]) new Object[capacity];
        size = 0;
    }
    public E peek() {
        if (isEmpty()) {throw new RuntimeException("Стек пуст");}
        return array[size - 1];
    }
    public void push(E o) {
        if (size == array.length) {
            resize();
        }
        array[size++] = o;
    }

    public E pop() {
        if (isEmpty()) {throw new RuntimeException("Стек пуст");}
        E o = array[--size];
        array[size] = null; // Для сборщика мусора
        return o;
    }

    public boolean isEmpty() {return size == 0;}

    private void resize() {
        E[] newArray = (E[]) new Object[array.length * 2];
        System.arraycopy(array, 0, newArray, 0, array.length);
        array = newArray;
    }
}