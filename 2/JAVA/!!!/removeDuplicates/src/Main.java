public class Main {
    public static void main(String[] args) {
        LinkedIntList list1 = new LinkedIntList();
        list1.add(new int[]{14, 8, 14, 12, 1, 14, 11, 8, 8, 10, 4, 9, 1,
                2, 5, 2, 4, 12, 12});
        System.out.println(list1);
        list1.removeDuplicates();
        System.out.println(list1);
    }
}
class LinkedIntList {
    static class ListNode {
        protected int data;
        protected ListNode next;
        ListNode(int a) {
            data = a;
            next = null;
        }
    }
    private ListNode head, last;
    public int length = 0;
    public void add(int value) {
        ListNode newNode = new ListNode(value);
        if (head == null) {
            head = newNode;
            last = head;
        }
        last.next = newNode;
        last = newNode;
        length++;
    }
    public void add(int[] arr) {
        for (int i : arr) {
            add(i);
        }
    }
    @Override
    public String toString() {
        StringBuilder result = new StringBuilder();
        result.append(head == null ? 0 : head.data);
        ListNode tmp = head == null ? null : head.next;
        while (tmp != null) {
            result.append(" ").append(tmp.data);
            tmp = tmp.next;
        }
        return result.toString();
    }
    public void removeDuplicates() {
        ListNode current = head, duplicate;
        while (current != null) {
            duplicate = current;
            while (duplicate.next != null) {
                if (duplicate.next.data == current.data) {
                    duplicate.next = duplicate.next.next;
                    if (duplicate.next == null)
                        last = duplicate;
                    continue;
                }
                duplicate = duplicate.next;
            }
            current = current.next;
        }
    }
}