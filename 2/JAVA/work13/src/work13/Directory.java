package work13;

import java.util.ArrayList;
import java.util.List;

public class Directory implements FileComponent {
    private final String name;
    private final List<FileComponent> children = new ArrayList<>();

    public Directory(String name) {
        this.name = name;
    }

    @Override
    public void display() {
        System.out.println("Directory: " + name);
        for (FileComponent child : children) {
            child.display();
        }
    }

    @Override
    public void add(FileComponent component) {
        children.add(component);
    }

    @Override
    public void remove(FileComponent component) {
        children.remove(component);
    }

    @Override
    public List<FileComponent> getChildren() {
        return children;
    }
}
