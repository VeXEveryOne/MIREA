public class ComplexNumber implements Number {
    private double real;  // Действительная часть
    private double imaginary;  // Мнимая часть

    // Конструктор для комплексного числа
    public ComplexNumber(double real, double imaginary) {
        this.real = real;
        this.imaginary = imaginary;
    }

    @Override
    public void print() {
        System.out.println(real + " + " + imaginary + "i");
    }

    // Геттеры для частных частей
    public double getReal() {
        return real;
    }

    public double getImaginary() {
        return imaginary;
    }
}
