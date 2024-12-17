package work13;

import java.util.List;

public interface FileComponent {
    void display(); // Метод для отображения содержимого

    default void add(FileComponent component) {
        throw new UnsupportedOperationException("Cannot add to a file.");
    }

    default void remove(FileComponent component) {
        throw new UnsupportedOperationException("Cannot remove from a file.");
    }

    default List<FileComponent> getChildren() {
        throw new UnsupportedOperationException("No children for a file.");
    }
}
