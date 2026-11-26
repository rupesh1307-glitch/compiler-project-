// Pre-loaded curated example Tiny C programs

export const EXAMPLES = {
  factorial: {
    name: 'Recursive Factorial',
    description: 'Computes factorial using recursion, demonstrating call stack frames.',
    code: `// Recursive Factorial in Tiny C
int factorial(int n) {
    if (n <= 1) {
        return 1;
    }
    return n * factorial(n - 1);
}

int main() {
    print_str("Computing factorials of 1 to 6:\\n");
    int i = 1;
    while (i <= 6) {
        int ans = factorial(i);
        print_int(i);
        print_str("! = ");
        print_int(ans);
        println();
        i = i + 1;
    }
    return 0;
}
`,
  },

  fibonacci: {
    name: 'Fibonacci Sequence',
    description: 'Generates Fibonacci numbers using an array buffer and a while loop.',
    code: `// Fibonacci sequence in Tiny C
int fib[10];

int main() {
    print_str("Generating first 10 Fibonacci numbers:\\n");
    fib[0] = 0;
    fib[1] = 1;

    print_str("F[0] = ");
    print_int(fib[0]);
    println();

    print_str("F[1] = ");
    print_int(fib[1]);
    println();

    int i = 2;
    while (i < 10) {
        fib[i] = fib[i - 1] + fib[i - 2];
        print_str("F[");
        print_int(i);
        print_str("] = ");
        print_int(fib[i]);
        println();
        i = i + 1;
    }

    return 0;
}
`,
  },

  bubble_sort: {
    name: 'Bubble Sort (Arrays & Loops)',
    description: 'Sorts an integer array using nested loops and element swaps.',
    code: `// Bubble Sort algorithm in Tiny C
int arr[6];

int main() {
    arr[0] = 64;
    arr[1] = 34;
    arr[2] = 25;
    arr[3] = 12;
    arr[4] = 22;
    arr[5] = 11;

    print_str("Initial array: ");
    int k = 0;
    while (k < 6) {
        print_int(arr[k]);
        print_str(" ");
        k = k + 1;
    }
    println();

    // Bubble Sort Algorithm
    int i = 0;
    while (i < 6) {
        int j = 0;
        while (j < 5 - i) {
            if (arr[j] > arr[j + 1]) {
                int temp = arr[j];
                arr[j] = arr[j + 1];
                arr[j + 1] = temp;
            }
            j = j + 1;
        }
        i = i + 1;
    }

    print_str("Sorted array:  ");
    k = 0;
    while (k < 6) {
        print_int(arr[k]);
        print_str(" ");
        k = k + 1;
    }
    println();

    return 0;
}
`,
  },

  prime_checker: {
    name: 'Prime Number Checker',
    description: 'Tests numbers for primality using modulo arithmetic and loops.',
    code: `// Prime Number Checker in Tiny C
int is_prime(int n) {
    if (n <= 1) {
        return 0;
    }
    int d = 2;
    while (d * d <= n) {
        if (n % d == 0) {
            return 0;
        }
        d = d + 1;
    }
    return 1;
}

int main() {
    print_str("Finding prime numbers between 2 and 30:\\n");
    int num = 2;
    while (num <= 30) {
        if (is_prime(num)) {
            print_int(num);
            print_str(" is prime\\n");
        }
        num = num + 1;
    }
    return 0;
}
`,
  },

  gcd: {
    name: 'GCD (Euclidean Algorithm)',
    description: 'Calculates the Greatest Common Divisor of two integers.',
    code: `// Euclidean Algorithm for Greatest Common Divisor
int gcd(int a, int b) {
    while (b != 0) {
        int rem = a % b;
        a = b;
        b = rem;
    }
    return a;
}

int main() {
    int x = 48;
    int y = 18;
    int result = gcd(x, y);

    print_str("GCD of ");
    print_int(x);
    print_str(" and ");
    print_int(y);
    print_str(" = ");
    print_int(result);
    println();
    return 0;
}
`,
  },

  optimizer_demo: {
    name: 'Optimizer & Constant Folding',
    description: 'Demonstrates compile-time constant folding, algebraic simplification, and dead code elimination.',
    code: `// Constant Folding and Dead Code Elimination Demo
int main() {
    // These constants will be folded at compile time!
    int a = 10 + 20 * 3;
    int b = a * 1;           // Algebraic simplification: x * 1 -> x
    int c = b + 0;           // Algebraic simplification: x + 0 -> x
    int dead_val = 999 * 4;  // Unused temporary (will be eliminated!)

    print_str("Optimized constant a = ");
    print_int(a);
    println();

    print_str("Optimized constant b = ");
    print_int(b);
    println();

    return 0;
}
`,
  },

  interactive_io: {
    name: 'Interactive User I/O',
    description: 'Demonstrates real-time user input with read_int() in the virtual machine.',
    code: `// Interactive Input Demo in Tiny C
int main() {
    print_str("Enter a positive number: ");
    int num = read_int();

    print_str("You entered: ");
    print_int(num);
    println();

    int squared = num * num;
    print_str("Its square is: ");
    print_int(squared);
    println();

    return 0;
}
`,
  },
};
