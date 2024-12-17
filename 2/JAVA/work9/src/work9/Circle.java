package work9;

class Circle implements Comparable<Circle> {
    private double radius;

    public Circle(double radius) {this.radius = radius;}
    public double getRadius() {return radius;}

    public int compareTo(Circle other) {return Double.compare(this.radius, other.radius);}
    public String toString() {return "Circle with radius: " + radius;}
}
