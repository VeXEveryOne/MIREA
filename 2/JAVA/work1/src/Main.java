public class Main {
    public static void main(String[] args) {
        Boat a = new Boat();
        output(a);

        Boat b = new Boat("Ponam-28V", "HWEGMWSO9", "White", 3640, 256, 2001);
        output(b);
        b.Age();
    }

    static void  output(Boat boat){
        System.out.println("My Boat");
        System.out.println("Model: " + boat.getModel());
        System.out.println("WIN-code: " + boat.getLicense());
        System.out.println("Color: " + boat.getColor());
        System.out.println("Width: " + boat.getWidth());
        System.out.println("HP: " + boat.getHorsePower());
        System.out.println("Year: " + boat.getHorsePower());

    }
}

class Boat{
    String model, license, color;
    int width, horsePower, year;

    public void Age(){
        System.out.println("Возраст: " + (2024-year));
    }
    public Boat(){
        model = "default";
        license = "default";
        color = "default";
        width = 0;
        horsePower = 0;
        year = 0;
    }

    public Boat(String model, String license, String color, int width, int horsePower, int year){
        this.model = model;
        this.license = license;
        this.color = color;
        this.width = width;
        this.horsePower = horsePower;
        this.year = year;

    }

    public String getModel() {
        return model;
    }

    public String getLicense() {
        return license;
    }

    public String getColor() {
        return color;
    }

    public int getWidth() {
        return width;
    }

    public int getHorsePower() {
        return horsePower;
    }

    public int getYear() {
        return year;
    }

    public void setModel(String model) {
        this.model = model;
    }

    public void setHorsePower(int horsePower) {
        this.horsePower = horsePower;
    }

    public void setWidth(int width) {
        this.width = width;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public void setLicense(String license) {
        this.license = license;
    }

    public void setYear(int year) {
        this.year = year;
    }
}