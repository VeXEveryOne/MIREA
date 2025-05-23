class FSMError(Exception):
    pass


class MooreFSM:
    def __init__(self):
        self.transitions = {
            'X2': {'color': [('', None, 'X0')]},
            'X0': {'scrub': [('v', 1, 'X1'), ('v', 0, 'X2')]},
            'X1': {'warp': [('', None, 'X7')]},
            'X7': {'put': [('', None, 'X6')]},
            'X6': {
                'warp': [('', None, 'X6')],
                'scrub': [('', None, 'X5')],
                'sort': [('', None, 'X0')]
            },
            'X5': {
                'rock': [('', None, 'X6')],
                'warp': [('', None, 'X3')],
                'skip': [('', None, 'X4')]
            },
            'X3': {'warp': [('', None, 'X4')]}
        }
        self.outputs = {
            'X2': 'y0', 'X0': 'y1', 'X1': 'y0', 'X7': 'y0',
            'X6': 'y0', 'X5': 'y0', 'X3': 'y0', 'X4': 'y1'
        }
        self._recalc_out_edges()
        self.current_state = 'X2'
        self.variables = {}
        self.visited_states = {'X2'}

    def _recalc_out_edges(self):
        self.out_edges_count = {
            state: sum(len(t) for t in methods.values())
            for state, methods in self.transitions.items()
        }
        self.max_out_edges = max(
            self.out_edges_count.values(), default=0
        )

    def get_output(self):
        return self.outputs[self.current_state]

    def has_max_out_edges(self):
        count = self.out_edges_count.get(self.current_state, 0)
        return count == self.max_out_edges and self.max_out_edges > 0

    def store_var(self, name, value):
        self.variables[name] = value

    def seen_state(self, state):
        return state in self.visited_states

    def _find_and_apply_transition(self, transitions):
        for var, val, target in transitions:
            if var == '' or self.variables.get(var) == val:
                self.current_state = target
                self.visited_states.add(target)
                return True
        return False

    def _transition(self, method):
        if self.current_state not in self.transitions:
            raise FSMError('unsupported')
        if method not in self.transitions[self.current_state]:
            raise FSMError('unsupported')
        trans = self.transitions[self.current_state][method]
        if not self._find_and_apply_transition(trans):
            raise FSMError('unsupported')
        return None

    def color(self):
        try:
            return self._transition('color')
        except FSMError:
            return 'unsupported'

    def scrub(self):
        try:
            return self._transition('scrub')
        except FSMError:
            return 'unsupported'

    def warp(self):
        try:
            return self._transition('warp')
        except FSMError:
            return 'unsupported'

    def put(self):
        try:
            return self._transition('put')
        except FSMError:
            return 'unsupported'

    def rock(self):
        try:
            return self._transition('rock')
        except FSMError:
            return 'unsupported'

    def skip(self):
        try:
            return self._transition('skip')
        except FSMError:
            return 'unsupported'

    def sort(self):
        try:
            return self._transition('sort')
        except FSMError:
            return 'unsupported'

    def __getattr__(self, name):
        method = name[3:] if name.startswith('go_') else name
        known = {m for trans in self.transitions.values() for m in trans}

        def _stub(*args, **kwargs):
            if method in known:
                return 'unsupported'
            return 'unknown'
        return _stub


def main():
    return MooreFSM()


def test_initial_state():
    fsm = main()
    assert not fsm.has_max_out_edges()
    assert not fsm.seen_state('X0')
    assert fsm.get_output() == 'y0'


def test_store_and_color():
    fsm = main()
    fsm.store_var('v', 1)
    assert fsm.color() is None
    assert fsm.seen_state('X0')
    assert fsm.get_output() == 'y1'


def test_unknown_and_scrub():
    fsm = main()
    assert fsm.file() == 'unknown'
    fsm.store_var('v', 1)
    fsm.color()
    assert fsm.scrub() is None
    assert fsm.get_output() == 'y0'


def test_scrub_and_warp_path():
    fsm = main()
    fsm.store_var('v', 1)
    fsm.color()
    fsm.scrub()
    assert fsm.get_output() == 'y0'
    fsm.warp()
    assert fsm.get_output() == 'y0'


def test_full_sequence_to_X4():
    fsm = main()
    fsm.store_var('v', 1)
    fsm.color()
    fsm.scrub()
    fsm.warp()
    fsm.put()
    fsm.scrub()
    fsm.skip()
    assert fsm.get_output() == 'y1'
    assert fsm.seen_state('X6')
    assert not fsm.has_max_out_edges()


def test_error_cases():
    fsm = main()
    assert fsm.put() == 'unsupported'
    assert fsm.nonexistent() == 'unknown'
    assert fsm.go_warp() == 'unsupported'


def test_sort_and_rock_and_warp():
    fsm = main()
    fsm.store_var('v', 1)
    fsm.color()
    fsm.scrub()
    fsm.warp()
    fsm.put()
    assert fsm.has_max_out_edges()
    assert fsm.sort() is None
    assert fsm.current_state == 'X0'
    fsm = main()
    fsm.store_var('v', 1)
    fsm.color()
    fsm.scrub()
    fsm.warp()
    fsm.put()
    prev = fsm.current_state
    assert fsm.warp() is None
    assert fsm.current_state == prev
    fsm.scrub()
    assert fsm.rock() is None
    assert fsm.current_state == 'X6'


def test_additional_branches():
    fsm = main()
    assert fsm.scrub() == 'unsupported'
    assert fsm.sort() == 'unsupported'
    assert fsm.rock() == 'unsupported'
    fsm = main()
    fsm.store_var('v', 0)
    fsm.color()
    assert fsm.scrub() is None
    assert fsm.current_state == 'X2'


def test_scrub_without_var_fails_in_x0():
    fsm = main()
    fsm.color()
    assert fsm.scrub() == 'unsupported'


def test_warp_via_x5_x3_to_x4():
    fsm = main()
    fsm.store_var('v', 1)
    fsm.color()
    fsm.scrub()
    fsm.warp()
    fsm.put()
    fsm.scrub()
    assert fsm.warp() is None
    assert fsm.current_state == 'X3'
    assert fsm.get_output() == 'y0'
    assert fsm.warp() is None
    assert fsm.current_state == 'X4'
    assert fsm.get_output() == 'y1'
    # unsupported after reaching X4
    assert fsm.scrub() == 'unsupported'


def test_go_known_method_unsupported_in_state():
    fsm = main()
    assert fsm.go_color() == 'unsupported'


def test_color_unsupported_in_wrong_state():
    fsm = main()
    fsm.color()  # X2 -> X0
    # Now color() is not supported in X0
    result = fsm.color()
    assert result == 'unsupported'  # triggers except FSMError


def test_scrub_unsupported_due_to_var():
    fsm = main()
    fsm.color()  # X2 ? X0
    fsm.store_var('v', 42)  # no matching condition
    result = fsm.scrub()
    assert result == 'unsupported'


def test_put_unsupported_in_X0():
    fsm = main()
    fsm.color()  # X2 ? X0
    result = fsm.put()  # put not allowed in X0
    assert result == 'unsupported'


def test_warp_unsupported_in_x0():
    fsm = main()
    fsm.color()  # X2 -> X0
    # В X0 метод warp не определён
    assert fsm.warp() == 'unsupported'


def test_skip_unsupported_in_x0():
    fsm = main()
    fsm.color()  # X2 -> X0
    # В X0 метод skip не определён
    assert fsm.skip() == 'unsupported'


def test():
    test_initial_state()
    test_store_and_color()
    test_unknown_and_scrub()
    test_scrub_and_warp_path()
    test_full_sequence_to_X4()
    test_error_cases()
    test_sort_and_rock_and_warp()
    test_additional_branches()
    test_scrub_without_var_fails_in_x0()
    test_warp_via_x5_x3_to_x4()
    test_go_known_method_unsupported_in_state()
    test_initial_state()
    test_store_and_color()
    test_unknown_and_scrub()
    test_scrub_and_warp_path()
    test_full_sequence_to_X4()
    test_error_cases()
    test_sort_and_rock_and_warp()
    test_go_known_method_unsupported_in_state()
    test_color_unsupported_in_wrong_state()
    test_scrub_unsupported_due_to_var()
    test_put_unsupported_in_X0()
    test_skip_unsupported_in_x0()
    test_warp_unsupported_in_x0()
