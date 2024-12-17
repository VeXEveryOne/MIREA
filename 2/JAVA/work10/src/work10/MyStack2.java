package work10;

import java.util.ArrayList;

public class MyStack2 extends ArrayList<Object> {
    public boolean isEmpty() { return super.isEmpty(); }
    public int getSize() {return super.size();}
    public Object peek() {return !isEmpty() ? super.get(size()-1) : null; }
    public Object pop() {return !isEmpty() ? super.remove(size()-1) : null; }
    public void push(Object obj) {super.add(obj); }
}

/*      +--------------------+          +--------------------+
        |      ArrayList     |          |      MyStack2       |
        |--------------------|          |--------------------|
        | - list: ArrayList  |<-------->| +isEmpty():boolean |
        | +size(): int       |          | +getSize(): int    |
        | +add(o: Object):   |          | +peek(): Object    |
        |                    |          | +pop(): Object     |
        +--------------------+          | +push(obj: Object) |
                                        +--------------------+
                                      (Наследование от ArrayList)                 */
