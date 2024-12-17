package praktika7;

public class Square extends GeometricObject implements Colorable{
    private int side;
    public Square(String color, boolean filled, int side){
        super(color,filled);
        this.side = side;
    }

    public void howToColor(){System.out.println("Colorize all the sides.");}
    public Square() {this.side = 0;}

    public double getArea(){return Math.pow(side,2);}
    public double getPerimeter(){return side*4;}


}
