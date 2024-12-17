package praktika7;

abstract public class GeometricObject implements Comparable{
    private String color = "white";
    private boolean filled;
    private java.util.Date dateCreated;

    public GeometricObject() {
        dateCreated = new java.util.Date();
    }

    public GeometricObject max(GeometricObject first, GeometricObject second){
        return first.getArea() > second.getArea()? first : second;
    }

    public String getColor() {
        return color;
    }
    public void setColor(String color) {
        this.color = color;
    }
    public boolean isFilled() {
        return filled;
    }
    public void setFilled(boolean filled) {
        this.filled = filled;
    }
    public java.util.Date getDateCreated() {
        return dateCreated;
    }

    public String toString() {
        return "создан " + dateCreated + ",\nцвет: " + color +
                ", заливка: " + filled;
    }
    public abstract double getArea();
    public abstract double getPerimeter();


    public int compareTo(GeometricObject first, GeometricObject second){
        return Double.compare(first.getArea(),second.getArea());
    }

    public GeometricObject(String color, boolean filled) {
        dateCreated = new java.util.Date();
        this.color = color;
        this.filled = filled;
    }
}