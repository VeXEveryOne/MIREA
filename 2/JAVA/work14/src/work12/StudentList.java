package work12;

import java.util.ArrayList;
import java.util.List;

public class StudentList {
    private List<Student> students = new ArrayList<>();

    public void addStudent(Student student) {
        students.add(student);
    }

    public StudentIterator getIterator() {
        return new StudentIterator();
    }

    private class StudentIterator implements Iterator<Student> {
        private int index = 0;

        @Override
        public boolean hasNext() {
            return index < students.size();
        }

        @Override
        public Student next() {
            if (!hasNext()) {
                throw new IllegalStateException("No more students in the list");
            }
            return students.get(index++);
        }
    }
}
