package work9;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Scanner;

public class Test {
    public static List<Object> removeRepetitive(ArrayList<Object> list) {
        List<Object> set = new ArrayList<>();
        for (Object i : list) {
            if (!set.contains(i)) {
                set.add(i);
            }
        }
        return set;
    }

    public static int search(ArrayList<Object> list, Object object){
        int count = 0;
        for (Object i : list){
            if (i.equals(object)) return count;
            else count++;
        }
        return -1;
    }

    public static Circle findLargest(ArrayList<Circle> circles) {
        if (circles.isEmpty()) return null;
        Circle largest = circles.get(0);
        for (Circle circle : circles) {
            if (circle.compareTo(largest) > 0) {
                largest = circle;
            }
        }
        return largest;
    }

    public static Circle findLargest2(ArrayList<ArrayList<Circle>> circles) {
        if (circles.isEmpty() || circles.get(0).isEmpty()) return null;
        Circle largest = circles.get(0).get(0);
        for (ArrayList<Circle> row : circles) {
            for (Circle circle : row) {
                if (circle.compareTo(largest) > 0) {
                    largest = circle;
                }
            }
        }
        return largest;
    }

    public static void main(String[] args) {
        ArrayList<Object> list = new ArrayList<>();
        list.add("ierjkgnvwij");
        list.add("kdn");
        list.add("qwerty");
        list.add("qwerty");
        System.out.println(list);

        List<Object> uniqueList = removeRepetitive(list);
        System.out.println("All duplicate elements removed");

        System.out.println(uniqueList);
        System.out.println(search(list,"qwerty") + " index of: " + list.get(search(list,"qwerty")));

        ArrayList<Circle> circles = new ArrayList<>();
        Collections.addAll(circles,new Circle(2.28), new Circle(1.37), new Circle(1.59));
        Circle largestCircle = findLargest(circles);
        System.out.println("Largest circle: " + largestCircle);

        ArrayList<ArrayList<Circle>> circles2 = new ArrayList<ArrayList<Circle>>();
        ArrayList<Circle> row1 = new ArrayList<>();
        row1.add(new Circle(69.69));
        row1.add(new Circle(77.77));

        ArrayList<Circle> row2 = new ArrayList<>();
        row2.add(new Circle(66.66));
        row2.add(new Circle(70.71));

        circles2.add(row1);
        circles2.add(row2);
        Circle largestCircle2 = findLargest2(circles2);
        System.out.println("Largest circle: " + largestCircle2);

        GenericStack<String> stack = new GenericStack<>();

        System.out.println("Enter 5 lines:");
        for (int i = 0; i < 5; i++) {
            stack.push(new Scanner(System.in).nextLine());
        }

        System.out.println("The lines are in reverse order:");
        while (!stack.isEmpty()) {
            System.out.print(stack.pop() + " ");
        }
    }
}