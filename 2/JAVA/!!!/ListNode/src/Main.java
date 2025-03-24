public class Main {
    public static void main(String[] args) {
        List list = new List();
        list.add(1);
        list.add(2);
        System.out.println(list);
        list.add(3);
        System.out.println(list);
    }
}
class List {
    private ListNode head, last;
    public void add(int value) {
        ListNode newNode = new ListNode(value);
        if (head == null) {
            head = newNode;
            last = head;
        }
        last.next = newNode;
        last = newNode;
    }
    @Override
    public String toString() {
        ListNode tmp;
        StringBuilder result = new StringBuilder();
        result.append(head.data);
        tmp = head.next;
        while (tmp != null) {
            result.append(" ").append(tmp.data);
            tmp = tmp.next;
        }
        return result.toString();
    }
}
class ListNode {
    public int data;
    public ListNode next;
    public ListNode() {
        data = 0;
        next = null;
    }
    public ListNode(int data) {
        this.data = data;
        next = null;
    }
    public ListNode(int data, ListNode next) {
        this.data = data;
        this.next = next;
    }
}