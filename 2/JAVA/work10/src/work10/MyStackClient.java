package work10;

import java.util.Scanner;

public class MyStackClient {
    public static void main(String[] args) {
        MyStack stack = new MyStack();
        System.out.println("Enter 5 lines:");
        for (int i = 0; i < 5; i++){
            stack.push(new Scanner(System.in).nextLine());
        }
        System.out.println("The lines are in reverse order:");
        while (!stack.isEmpty()){
            System.out.print(stack.pop()+" ");
        }
    }
}
