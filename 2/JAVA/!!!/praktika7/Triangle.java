package praktika7;

public class Triangle extends GeometricObject{
    private double side1 = 1.0;
    private double side2 = 1.0;
    private double side3 = 1.0;

    public double getArea(){return Math.sqrt(((side1 + side2 + side3) / 2) * (((side1 + side2 + side3) / 2) - side1) * (((side1 + side2 + side3) / 2) - side2) * (((side1 + side2 + side3) / 2) - side3));}
    public double getPerimeter(){return side1 + side2 + side3;}

    public Triangle(String color, boolean filled, double side1, double side2, double side3) throws IllegalTriangleException{
        super(color, filled);
        if (!isValidTriangle(side1, side2, side3)) {
            throw new IllegalTriangleException("The sum of the lengths of any two sides must be greater than the length of the third side.");
        }
        this.side1 = side1;
        this.side2 = side2;
        this.side3 = side3;
    }

    private boolean isValidTriangle(double side1, double side2, double side3) {
        return (side1 + side2 > side3) && (side1 + side3 > side2) && (side2 + side3 > side1);
    }

    public String toString(){
        return "Triangle: side1 = " + side1 + " side2 = " + side2 + " side3 = " + side3 + "\nColor: " + getColor()
                + " Triangle is filled: " + isFilled();
    }

    public double getSide1() {
        return side1;
    }

    public void setSide1(double side1) {
        this.side1 = side1;
    }

    public double getSide2() {
        return side2;
    }

    public void setSide2(double side2) {
        this.side2 = side2;
    }

    public double getSide3() {
        return side3;
    }

    public void setSide3(double side3) {
        this.side3 = side3;
    }
}
