package praktika7;

import java.util.ArrayList;
import java.util.Scanner;

public class Test {
    public static void main(String[] args) {
        Scanner console = new Scanner(System.in);
        System.out.print("Enter the first side of triangle: ");
        double side1 = console.nextDouble();
        System.out.print("Enter the second side of triangle: ");
        double side2 = console.nextDouble();
        System.out.print("Enter the third side of triangle: ");
        double side3 = console.nextDouble();
        System.out.print("Enter the color of triangle: ");
        console.nextLine();
        String color = console.nextLine();
        System.out.println("Enter the word \"filled\" if you want your object to be filled, any other symbol for being it unfilled: ");
        boolean filled = console.nextLine().equals("filled");
        try {
            Triangle triangle = new Triangle(color,filled,side1,side2,side3);
            Triangle triangle2 = new Triangle("black", false, 7, 8, 9);
            System.out.println(triangle.toString());
            System.out.println("Perimeter of triangle is: " + triangle.getPerimeter());
            System.out.println("Area of triangle is: " + triangle.getArea());
        }catch (IllegalTriangleException exception){
            System.out.println("Error! " + exception.getMessage());
        }

        System.out.println("------------------------------------------------");
        System.out.println();
        Rectangle rectangle = new Rectangle(5,6, "green", false);
        Circle circle = new Circle(4, "green", false);
        System.out.println("The area of circle is: " + circle.getArea());
        System.out.println("The area of rectangle is: " + rectangle.getArea());
        GeometricObject bigger = rectangle.max(rectangle,circle);
        if (bigger instanceof Circle){System.out.println("The area of circle is bigger!");}
        else if (bigger instanceof Rectangle){System.out.println("The area of rectangle is bigger!");}

        System.out.println("------------------------------------------------");
        System.out.println();
        ComparableCircle circle2 = new ComparableCircle(4,"yellow", true);
        int compares = circle2.compareTo(circle,circle2);
        switch (compares){
            case 1:
                System.out.println("The first circle area is bigger!");
                break;
            case 0:
                System.out.println("The areas are equals!");
                break;
            case -1:
                System.out.println("The second circle area is bigger!");
                break;
        }

        System.out.println("------------------------------------------------");
        System.out.println();
        ArrayList<GeometricObject> figures = new ArrayList<>();
        figures.add(new Square("white",false,2));
        figures.add(new Rectangle(7,8,"white",false));
        figures.add(new Square("black",true,4));
        figures.add(new Circle(12,"white",false));
        try {
            figures.add(new Triangle("red", true, 3, 4, 5));
        } catch (IllegalTriangleException exception){
            System.out.println("Error! " + exception.getMessage());
        }
        for (GeometricObject object : figures){
            System.out.println("The area of figure is: " + object.getArea());
            if (object instanceof Colorable){
                ((Colorable) object).howToColor();
                System.out.println("-------");
            }
        }
    }
}
