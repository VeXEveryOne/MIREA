public class NumberFactory {

    // Фабричный метод для создания комплексного числа
    public static Number createComplexNumber(double real, double imaginary) {
        return new ComplexNumber(real, imaginary);
    }

    // Фабричный метод для создания рационального числа
    public static Number createRationalNumber(int numerator, int denominator) {
        return new RationalNumber(numerator, denominator);
    }
}
