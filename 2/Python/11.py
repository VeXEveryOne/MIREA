class MooreMachine:
    def __init__(self):
        self.state = 'X2'
        self.var_storage = {}
        self.visited_states = set([self.state])
        self.output = 'y0'
        self.transitions = {
            'X2': {'color': ('X0', 'y1')},
            'X0': {'small': ('X6', 'y2'), 'deep': ('X1', 'y3')},
            'X6': {'empty': ('X4', 'y5')},
            'X4': {'deep': ('X1', 'y6')},
            'X1': {'full': ('X3', 'y4')},
            'X3': {'check': ('X2', 'y0')},
            'X7': {},
            'X5': {}
        }

    def store_var(self, name, value):
        self.var_storage[name] = value

    def seen_state(self, state):
        return state in self.visited_states

    def get_output(self):
        return self.output

    def has_max_out_edges(self):
        max_out = max(len(v) for v in self.transitions.values())
        return len(self.transitions.get(self.state, {})) == max_out

    def _try_transition(self, action):
        if action in self.transitions.get(self.state, {}):
            new_state, output = self.transitions[self.state][action]
            self.state = new_state
            self.output = output
            self.visited_states.add(new_state)
            return None
        else:
            return 'unsupported'

    # Методы переходов
    def color(self):
        return self._try_transition('color')

    def small(self):
        return self._try_transition('small')

    def deep(self):
        return self._try_transition('deep')

    def full(self):
        return self._try_transition('full')

    def empty(self):
        return self._try_transition('empty')

    def check(self):
        return self._try_transition('check')

    # Перехват любых неизвестных методов
    def __getattr__(self, name):
        def method(*args, **kwargs):
            return 'unknown'
        return method


def main():
    return MooreMachine()


def test():
    obj = main()

    assert obj.has_max_out_edges() is False
    assert obj.store_var('v', 1) is None
    assert obj.color() is None           # X2 -> X0
    assert obj.get_output() == 'y1'
    assert obj.seen_state('X7') is False
    assert obj.file() == 'unknown'
    assert obj.scrub() == 'unknown'
    assert obj.deep() is None            # X0 -> X1
    assert obj.get_output() == 'y3'
    assert obj.small() == 'unsupported'
    assert obj.full() is None            # X1 -> X3
    assert obj.get_output() == 'y4'
    assert obj.check() is None           # X3 -> X2
    assert obj.get_output() == 'y0'
    assert obj.empty() == 'unsupported'
    assert obj.color() is None           # X2 -> X0
    assert obj.small() is None           # X0 -> X6
    assert obj.seen_state('X6') is True
    assert obj.get_output() == 'y2'
    assert obj.empty() is None           # X6 -> X4
    assert obj.get_output() == 'y5'
    assert obj.deep() is None            # X4 -> X1
    assert obj.get_output() == 'y6'
    assert obj.full() is None            # X1 -> X3
    assert obj.get_output() == 'y4'
    assert obj.check() is None           # X3 -> X2
    assert obj.get_output() == 'y0'
    assert obj.full() == 'unsupported'
    assert obj.empty() == 'unsupported'
    assert obj.check() == 'unsupported'
    assert obj.unknown_method() == 'unknown'
