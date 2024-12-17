package work12;

public class Main {
    public static void main(String[] args) {
        StudentList studentList = new StudentList();
        studentList.addStudent(new Student("Алиса", 20));
        studentList.addStudent(new Student("Илья", 22));
        studentList.addStudent(new Student("Вадим", 21));

        Iterator<Student> iterator = studentList.getIterator();

        while (iterator.hasNext()) {
            System.out.println(iterator.next());
        }
    }
}
