public class RationalNumber implements Number {
    private int numerator;  // Числитель
    private int denominator;  // Знаменатель

    // Конструктор для рационального числа
    public RationalNumber(int numerator, int denominator) {
        if (denominator == 0) {
            throw new IllegalArgumentException("Denominator cannot be zero.");
        }
        this.numerator = numerator;
        this.denominator = denominator;
    }

    @Override
    public void print() {
        System.out.println(numerator + "/" + denominator);
    }

    // Геттеры для числителя и знаменателя
    public int getNumerator() {
        return numerator;
    }

    public int getDenominator() {
        return denominator;
    }
}
