public class Main {
    public static void main(String[] args) {
        LinkedIntList list1 = new LinkedIntList();
        LinkedIntList list2 = new LinkedIntList();
        list1.add(new int[]{1, 3, 5, 7});
        System.out.println("list1: " + list1);
        list2.add(new int[]{1, 2, 3, 4, 5});
        System.out.println("list2: " + list2);
        list2.removeAll(list1);
        System.out.println("list1: " + list2);
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
    public void add(int value) {
        ListNode newNode = new ListNode(value);
        if (head == null) {
            head = newNode;
            last = head;
        }
        last.next = newNode;
        last = newNode;
    }
    public void add(int[] arr) {
        for (int i : arr) {
            add(i);
        }
    }
    @Override
    public String toString() {
        ListNode tmp = head;
        String s = "";
        while (tmp != null) {
            s += tmp.data + " ";
            tmp = tmp.next;
        }
        return s;
    }
    public void removeAll(LinkedIntList list) {
        ListNode tmp = head, obs = list.head, slow = head;
        while (tmp != null && obs != null) {
            if (tmp.data < obs.data) {
                slow = tmp;
                tmp = tmp.next;
                continue;
            }
            if (tmp.data > obs.data) {
                obs = obs.next;
                continue;
            }
            if (tmp == head) {
                head = head.next;
                slow = head;
                tmp = head;
                continue;
            }
            slow.next = tmp.next;
            tmp = slow.next;
        }
    }
}