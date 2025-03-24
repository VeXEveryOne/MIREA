public class Main {
    public static void main(String[] args) {
        // Используем фабрику для создания объектов чисел
        Number complex = NumberFactory.createComplexNumber(3.5, 4.2);
        Number rational = NumberFactory.createRationalNumber(7, 2);

        // Печать чисел
        System.out.print("Complex Number: ");
        complex.print();  // Вывод: 3.5 + 4.2i

        System.out.print("Rational Number: ");
        rational.print();  // Вывод: 7/2
    }
}
