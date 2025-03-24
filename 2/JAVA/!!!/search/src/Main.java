public class Main {
    static public void main(String[] args) {
        Searcher<Animal> Find = new Searcher<>();
        Animal d1 = new Dog(false, "d1");
        Animal d2 = new Dog(false, "d2");
        Animal d3 = new Dog(false, "d3");
        Animal c1 = new Cat(false, "c1");
        Animal c2 = new Cat(true, "c2");
        Animal c3 = new Cat(false, "c3");
        Animal[] Animals = {d1, d2, d3, c1, c2, c3};
        Animal cutie = Find.Cuties(Animals);
        System.out.println(cutie.toString());
    }
}
interface Animal {
    boolean isCutie();
}
class Cat implements Animal {
    public boolean isCutie;
    public String name;
    public Cat(boolean status, String name) {
        isCutie = status;
        this.name = name;
    }
    public boolean isCutie() {
        return isCutie;
    }
    @Override
    public String toString() {
        return "Cat{" +
                "isCutie=" + isCutie +
                ", name='" + name + '\'' +
                '}';
    }
}
class Dog implements Animal {
    public boolean isCutie;
    public String name;
    public Dog(boolean status, String name) {
        isCutie = status;
        this.name = name;
    }
    public boolean isCutie() {
        return isCutie;
    }
    @Override
    public String toString() {
        return "Dog{" +
                "isCutie=" + isCutie +
                ", name='" + name + '\'' +
                '}';
    }
}
class Searcher<T extends Animal> {
    public T Cuties(T[] IArray) {
        for (T obj : IArray) {
            if (obj.isCutie())
                return obj;
        }
        return null;
    }
}