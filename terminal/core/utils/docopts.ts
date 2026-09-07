#!/usr/bin/env bun
// Shell interface for docopt. A TypeScript port of docopts 0.6.1+fix and of
// docopt.py 0.6.2, both MIT licensed by Vladimir Keleshev and Lari Rasku, so
// the terminal/bin scripts need Bun and nothing else.

import { readFileSync, writeSync } from "node:fs";

const DOC = `Shell interface for docopt, the CLI description language.

Usage:
  docopts [options] -h <msg> : [<argv>...]

Options:
  -h <msg>, --help=<msg>        The help message in docopt format.
                                If - is given, read the help message from
                                standard input.
                                If no argument is given, print docopts's own
                                help message and quit.
  -V <msg>, --version=<msg>     A version message.
                                If - is given, read the version message from
                                standard input.  If the help message is also
                                read from standard input, it is read first.
                                If no argument is given, print docopts's own
                                version message and quit.
  -O, --options-first           Disallow interspersing options and positional
                                arguments: all arguments starting from the
                                first one that does not begin with a dash will
                                be treated as positional arguments.
  -H, --no-help                 Don't handle --help and --version specially.
  -A <name>                     Export the arguments as a Bash 4.x associative
                                array called <name>.
  -s <str>, --separator=<str>   The string to use to separate the help message
                                from the version message when both are given
                                via standard input. [default: ----]
`;

const VERSION = `docopts 0.6.1+fix, TypeScript port
Copyright (C) 2013 Vladimir Keleshev, Lari Rasku.
License MIT <http://opensource.org/licenses/MIT>.
This is free software: you are free to change and redistribute it.
There is NO WARRANTY, to the extent permitted by law.
`;

type Value = null | boolean | number | string | string[];
type MatchResult = [boolean, Leaf[], Leaf[]];
type PatternClass = abstract new (...args: never[]) => Pattern;

// Error in the usage text written by the script author.
class DocoptLanguageError extends Error {}

// The script was invoked with arguments that do not fit the usage text.
class DocoptExit extends Error {
  static usage = "";

  constructor(message = "") {
    super(`${message}\n${DocoptExit.usage}`.trim());
  }
}

// --help or --version was given; `text` is what docopt would print.
class HelpExit extends Error {
  constructor(public text: string) {
    super(text);
  }
}

function pyrepr(value: Value): string {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return JSON.stringify(value);
  return `[${value.map((item) => JSON.stringify(item)).join(", ")}]`;
}

function partition(source: string, separator: string): [string, string, string] {
  const index = source.indexOf(separator);
  if (index === -1) return [source, "", ""];
  return [source.slice(0, index), separator, source.slice(index + separator.length)];
}

// docopt.py compares patterns by repr, so "same" means same repr here.
function unique<T extends Pattern>(patterns: T[]): T[] {
  const seen = new Set<string>();
  return patterns.filter((pattern) => {
    const key = pattern.repr();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sameList(a: Leaf[], b: Leaf[]): boolean {
  return a.length === b.length && a.every((item, i) => item.repr() === b[i].repr());
}

abstract class Pattern {
  abstract repr(): string;
  abstract flat(...types: PatternClass[]): Pattern[];
  abstract match(left: Leaf[], collected?: Leaf[]): MatchResult;

  fix(): this {
    this.fixIdentities();
    this.fixRepeatingArguments();
    return this;
  }

  // Make pattern-tree tips point to the same object when they are equal.
  fixIdentities(uniq?: Pattern[]): void {
    if (!(this instanceof Branch)) return;
    const pool = uniq ?? unique(this.flat());
    this.children.forEach((child, i) => {
      if (child instanceof Branch) {
        child.fixIdentities(pool);
        return;
      }
      const same = pool.find((candidate) => candidate.repr() === child.repr());
      if (!same) throw new Error(`pattern tip not found: ${child.repr()}`);
      this.children[i] = same;
    });
  }

  // Elements that repeat in one alternative accumulate or count values.
  fixRepeatingArguments(): void {
    const cases = transform(this).children.map((child) => [...(child as Branch).children]);
    for (const alternative of cases) {
      for (const element of alternative) {
        if (alternative.filter((other) => other.repr() === element.repr()).length <= 1) continue;
        const isOption = element.constructor === Option;
        const argcount = isOption ? (element as Option).argcount : 0;
        const leaf = element as Leaf;
        if (element.constructor === Argument || (isOption && argcount)) {
          if (leaf.value === null) leaf.value = [];
          else if (!Array.isArray(leaf.value)) leaf.value = String(leaf.value).split(/\s+/).filter(Boolean);
        }
        if (element.constructor === Command || (isOption && argcount === 0)) leaf.value = 0;
      }
    }
  }
}

// Expand a pattern into an equivalent one with a single top-level Either.
// ((-a | -b) (-c | -d)) => (-a -c | -a -d | -b -c | -b -d)
function transform(pattern: Pattern): Either {
  const result: Pattern[][] = [];
  const groups: Pattern[][] = [[pattern]];
  const parents: PatternClass[] = [Required, Optional, OptionsShortcut, Either, OneOrMore];
  while (groups.length) {
    const children = groups.shift() as Pattern[];
    const index = children.findIndex((child) => parents.includes(child.constructor as PatternClass));
    if (index === -1) {
      result.push(children);
      continue;
    }
    const child = children[index] as Branch;
    children.splice(index, 1);
    if (child instanceof Either) {
      for (const alternative of child.children) groups.push([alternative, ...children]);
    } else if (child instanceof OneOrMore) {
      groups.push([...child.children, ...child.children, ...children]);
    } else {
      groups.push([...child.children, ...children]);
    }
  }
  return new Either(...result.map((alternative) => new Required(...alternative)));
}

abstract class Leaf extends Pattern {
  name: string | null;
  value: Value;

  constructor(name: string | null, value: Value = null) {
    super();
    this.name = name;
    this.value = value;
  }

  repr(): string {
    return `${this.constructor.name}(${pyrepr(this.name)}, ${pyrepr(this.value)})`;
  }

  flat(...types: PatternClass[]): Pattern[] {
    return !types.length || types.includes(this.constructor as PatternClass) ? [this] : [];
  }

  abstract singleMatch(left: Leaf[]): [number, Leaf] | [null, null];

  match(left: Leaf[], collected: Leaf[] = []): MatchResult {
    const [position, match] = this.singleMatch(left);
    if (match === null) return [false, left, collected];
    const rest = [...left.slice(0, position), ...left.slice(position + 1)];
    const sameName = collected.filter((item) => item.name === this.name);
    if (typeof this.value === "number" || Array.isArray(this.value)) {
      const increment: number | string[] =
        typeof this.value === "number"
          ? 1
          : typeof match.value === "string"
            ? [match.value]
            : (match.value as string[]);
      if (!sameName.length) {
        match.value = increment;
        return [true, rest, [...collected, match]];
      }
      const first = sameName[0];
      if (typeof increment === "number") first.value = (first.value as number) + increment;
      else first.value = [...(first.value as string[]), ...increment];
      return [true, rest, collected];
    }
    return [true, rest, [...collected, match]];
  }
}

abstract class Branch extends Pattern {
  children: Pattern[];

  constructor(...children: Pattern[]) {
    super();
    this.children = children;
  }

  repr(): string {
    return `${this.constructor.name}(${this.children.map((child) => child.repr()).join(", ")})`;
  }

  flat(...types: PatternClass[]): Pattern[] {
    if (types.includes(this.constructor as PatternClass)) return [this];
    return this.children.flatMap((child) => child.flat(...types));
  }
}

class Argument extends Leaf {
  singleMatch(left: Leaf[]): [number, Leaf] | [null, null] {
    for (const [n, pattern] of left.entries()) {
      if (pattern.constructor === Argument) return [n, new Argument(this.name, pattern.value)];
    }
    return [null, null];
  }
}

class Command extends Argument {
  constructor(name: string | null, value: Value = false) {
    super(name, value);
  }

  singleMatch(left: Leaf[]): [number, Leaf] | [null, null] {
    for (const [n, pattern] of left.entries()) {
      if (pattern.constructor === Argument) {
        if (pattern.value === this.name) return [n, new Command(this.name, true)];
        break;
      }
    }
    return [null, null];
  }
}

class Option extends Leaf {
  short: string | null;
  long: string | null;
  argcount: number;

  constructor(short: string | null = null, long: string | null = null, argcount = 0, value: Value = false) {
    super(long || short, value === false && argcount ? null : value);
    this.short = short;
    this.long = long;
    this.argcount = argcount;
  }

  static parse(optionDescription: string): Option {
    let short: string | null = null;
    let long: string | null = null;
    let argcount = 0;
    let value: Value = false;
    const [options, , description] = partition(optionDescription.trim(), "  ");
    for (const token of options.replaceAll(",", " ").replaceAll("=", " ").split(/\s+/).filter(Boolean)) {
      if (token.startsWith("--")) long = token;
      else if (token.startsWith("-")) short = token;
      else argcount = 1;
    }
    if (argcount) {
      const matched = /\[default: (.*)\]/i.exec(description);
      value = matched ? matched[1] : null;
    }
    return new Option(short, long, argcount, value);
  }

  repr(): string {
    return `Option(${pyrepr(this.short)}, ${pyrepr(this.long)}, ${this.argcount}, ${pyrepr(this.value)})`;
  }

  singleMatch(left: Leaf[]): [number, Leaf] | [null, null] {
    for (const [n, pattern] of left.entries()) {
      if (this.name === pattern.name) return [n, pattern];
    }
    return [null, null];
  }
}

class Required extends Branch {
  match(left: Leaf[], collected: Leaf[] = []): MatchResult {
    let l = left;
    let c = collected;
    for (const pattern of this.children) {
      const [matched, nextLeft, nextCollected] = pattern.match(l, c);
      if (!matched) return [false, left, collected];
      l = nextLeft;
      c = nextCollected;
    }
    return [true, l, c];
  }
}

class Optional extends Branch {
  match(left: Leaf[], collected: Leaf[] = []): MatchResult {
    let l = left;
    let c = collected;
    for (const pattern of this.children) [, l, c] = pattern.match(l, c);
    return [true, l, c];
  }
}

// Marker for the [options] shortcut.
class OptionsShortcut extends Optional {}

class OneOrMore extends Branch {
  match(left: Leaf[], collected: Leaf[] = []): MatchResult {
    let l = left;
    let c = collected;
    let previous: Leaf[] | null = null;
    let matched = true;
    let times = 0;
    while (matched) {
      [matched, l, c] = this.children[0].match(l, c);
      if (matched) times++;
      if (previous !== null && sameList(previous, l)) break;
      previous = l;
    }
    return times >= 1 ? [true, l, c] : [false, left, collected];
  }
}

class Either extends Branch {
  match(left: Leaf[], collected: Leaf[] = []): MatchResult {
    const outcomes = this.children.map((pattern) => pattern.match(left, collected)).filter((outcome) => outcome[0]);
    if (!outcomes.length) return [false, left, collected];
    return outcomes.reduce((best, outcome) => (outcome[1].length < best[1].length ? outcome : best));
  }
}

class Tokens {
  tokens: string[];

  constructor(
    source: string | string[],
    public errorKind: "exit" | "language" = "exit",
  ) {
    this.tokens = typeof source === "string" ? source.split(/\s+/).filter(Boolean) : [...source];
  }

  static fromPattern(source: string): Tokens {
    const spaced = source.replace(/([[\]()|]|\.\.\.)/g, " $1 ");
    return new Tokens(spaced.split(/\s+|(\S*<.*?>)/).filter(Boolean), "language");
  }

  move(): string | null {
    return this.tokens.length ? (this.tokens.shift() as string) : null;
  }

  current(): string | null {
    return this.tokens.length ? this.tokens[0] : null;
  }

  error(message: string): Error {
    return this.errorKind === "exit" ? new DocoptExit(message) : new DocoptLanguageError(message);
  }

  parsingArgv(): boolean {
    return this.errorKind === "exit";
  }
}

// long ::= '--' chars [ ( ' ' | '=' ) chars ] ;
function parseLong(tokens: Tokens, options: Option[]): Option[] {
  const [long, eq, rawValue] = partition(tokens.move() as string, "=");
  let value: string | null = eq === "" && rawValue === "" ? null : rawValue;
  let similar = options.filter((option) => option.long === long);
  if (tokens.parsingArgv() && !similar.length) {
    similar = options.filter((option) => option.long?.startsWith(long));
  }
  let option: Option;
  if (similar.length > 1) {
    throw tokens.error(`${long} is not a unique prefix: ${similar.map((o) => o.long).join(", ")}?`);
  } else if (similar.length < 1) {
    const argcount = eq === "=" ? 1 : 0;
    option = new Option(null, long, argcount);
    options.push(option);
    if (tokens.parsingArgv()) option = new Option(null, long, argcount, argcount ? value : true);
  } else {
    const [found] = similar;
    option = new Option(found.short, found.long, found.argcount, found.value);
    if (option.argcount === 0) {
      if (value !== null) throw tokens.error(`${option.long} must not have an argument`);
    } else if (value === null) {
      const next = tokens.current();
      if (next === null || next === "--") throw tokens.error(`${option.long} requires argument`);
      value = tokens.move();
    }
    if (tokens.parsingArgv()) option.value = value !== null ? value : true;
  }
  return [option];
}

// shorts ::= '-' ( chars )* [ [ ' ' ] chars ] ;
function parseShorts(tokens: Tokens, options: Option[]): Option[] {
  const token = tokens.move() as string;
  let left = token.replace(/^-+/, "");
  const parsed: Option[] = [];
  while (left !== "") {
    const short = `-${left[0]}`;
    left = left.slice(1);
    const similar = options.filter((option) => option.short === short);
    let option: Option;
    if (similar.length > 1) {
      throw tokens.error(`${short} is specified ambiguously ${similar.length} times`);
    } else if (similar.length < 1) {
      option = new Option(short, null, 0);
      options.push(option);
      if (tokens.parsingArgv()) option = new Option(short, null, 0, true);
    } else {
      const [found] = similar;
      option = new Option(short, found.long, found.argcount, found.value);
      let value: string | null = null;
      if (option.argcount !== 0) {
        if (left === "") {
          const next = tokens.current();
          if (next === null || next === "--") throw tokens.error(`${short} requires argument`);
          value = tokens.move();
        } else {
          value = left;
          left = "";
        }
      }
      if (tokens.parsingArgv()) option.value = value !== null ? value : true;
    }
    parsed.push(option);
  }
  return parsed;
}

function parsePattern(source: string, options: Option[]): Required {
  const tokens = Tokens.fromPattern(source);
  const result = parseExpr(tokens, options);
  if (tokens.current() !== null) throw tokens.error(`unexpected ending: '${tokens.tokens.join(" ")}'`);
  return new Required(...result);
}

// expr ::= seq ( '|' seq )* ;
function parseExpr(tokens: Tokens, options: Option[]): Pattern[] {
  let seq = parseSeq(tokens, options);
  if (tokens.current() !== "|") return seq;
  let result: Pattern[] = seq.length > 1 ? [new Required(...seq)] : seq;
  while (tokens.current() === "|") {
    tokens.move();
    seq = parseSeq(tokens, options);
    result = result.concat(seq.length > 1 ? [new Required(...seq)] : seq);
  }
  return result.length > 1 ? [new Either(...result)] : result;
}

// seq ::= ( atom [ '...' ] )* ;
function parseSeq(tokens: Tokens, options: Option[]): Pattern[] {
  const result: Pattern[] = [];
  while (![null, "]", ")", "|"].includes(tokens.current())) {
    let atom = parseAtom(tokens, options);
    if (tokens.current() === "...") {
      atom = [new OneOrMore(...atom)];
      tokens.move();
    }
    result.push(...atom);
  }
  return result;
}

function isUpper(token: string): boolean {
  return /[A-Za-z]/.test(token) && token === token.toUpperCase();
}

// atom ::= '(' expr ')' | '[' expr ']' | 'options' | long | shorts | argument | command ;
function parseAtom(tokens: Tokens, options: Option[]): Pattern[] {
  const token = tokens.current() as string;
  if (token === "(" || token === "[") {
    tokens.move();
    const closing = token === "(" ? ")" : "]";
    const inner = parseExpr(tokens, options);
    const result = token === "(" ? new Required(...inner) : new Optional(...inner);
    if (tokens.move() !== closing) throw tokens.error(`unmatched '${token}'`);
    return [result];
  }
  if (token === "options") {
    tokens.move();
    return [new OptionsShortcut()];
  }
  if (token.startsWith("--") && token !== "--") return parseLong(tokens, options);
  if (token.startsWith("-") && token !== "-" && token !== "--") return parseShorts(tokens, options);
  if ((token.startsWith("<") && token.endsWith(">")) || isUpper(token)) return [new Argument(tokens.move())];
  return [new Command(tokens.move())];
}

// With optionsFirst, every argument after the first positional is positional.
function parseArgv(tokens: Tokens, options: Option[], optionsFirst = false): Leaf[] {
  const parsed: Leaf[] = [];
  const rest = () => tokens.tokens.map((value) => new Argument(null, value));
  while (tokens.current() !== null) {
    const current = tokens.current() as string;
    if (current === "--") return [...parsed, ...rest()];
    if (current.startsWith("--")) parsed.push(...parseLong(tokens, options));
    else if (current.startsWith("-") && current !== "-") parsed.push(...parseShorts(tokens, options));
    else if (optionsFirst) return [...parsed, ...rest()];
    else parsed.push(new Argument(null, tokens.move()));
  }
  return parsed;
}

function parseSection(name: string, source: string): string[] {
  const pattern = new RegExp(`^([^\\n]*${name}[^\\n]*\\n?(?:[ \\t].*?(?:\\n|$))*)`, "gim");
  return [...source.matchAll(pattern)].map((match) => match[1].trim());
}

function parseDefaults(doc: string): Option[] {
  const defaults: Option[] = [];
  for (const section of parseSection("options:", doc)) {
    const [, , body] = partition(section, ":");
    const split = `\n${body}`.split(/\n[ \t]*(-\S+?)/).slice(1);
    for (let i = 0; i + 1 < split.length; i += 2) {
      const description = split[i] + split[i + 1];
      if (description.startsWith("-")) defaults.push(Option.parse(description));
    }
  }
  return defaults;
}

function formalUsage(section: string): string {
  const [, , body] = partition(section, ":");
  const words = body.split(/\s+/).filter(Boolean);
  return `( ${words.slice(1).map((word) => (word === words[0] ? ") | (" : word)).join(" ")} )`;
}

function extras(help: boolean, version: string | null, options: Leaf[], doc: string): void {
  if (help && options.some((o) => (o.name === "-h" || o.name === "--help") && o.value)) {
    throw new HelpExit(`${doc.replace(/^\n+|\n+$/g, "")}\n`);
  }
  if (version && options.some((o) => o.name === "--version" && o.value)) {
    throw new HelpExit(`${version}\n`);
  }
}

function docopt(doc: string, argv: string[], help = true, version: string | null = null, optionsFirst = false): Map<string, Value> {
  const usageSections = parseSection("usage:", doc);
  if (usageSections.length === 0) throw new DocoptLanguageError('"usage:" (case-insensitive) not found.');
  if (usageSections.length > 1) throw new DocoptLanguageError('More than one "usage:" (case-insensitive).');
  DocoptExit.usage = usageSections[0];

  const options = parseDefaults(doc);
  const pattern = parsePattern(formalUsage(DocoptExit.usage), options);
  const parsedArgv = parseArgv(new Tokens(argv), [...options], optionsFirst);
  const patternOptions = new Set(pattern.flat(Option).map((option) => option.repr()));
  for (const shortcut of pattern.flat(OptionsShortcut) as OptionsShortcut[]) {
    shortcut.children = unique(parseDefaults(doc)).filter((option) => !patternOptions.has(option.repr()));
  }
  extras(help, version, parsedArgv, doc);
  const [matched, left, collected] = pattern.fix().match(parsedArgv);
  if (matched && left.length === 0) {
    const result = new Map<string, Value>();
    for (const leaf of [...(pattern.flat() as Leaf[]), ...collected]) result.set(leaf.name as string, leaf.value);
    return result;
  }
  throw new DocoptExit();
}

// Shell output, as docopts prints it.

function shellquote(source: string): string {
  return `'${source.replaceAll("'", "'\\''")}'`;
}

function isBashIdentifier(source: string): boolean {
  return /^([A-Za-z]|[A-Za-z_][0-9A-Za-z_]+)$/.test(source);
}

function toBash(value: Value): string {
  if (value === null) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return shellquote(value);
  return `(${value.map(shellquote).join(" ")})`;
}

class MangleError extends Error {}

function nameMangle(element: string): string | null {
  if (element === "-" || element === "--") return null;
  let variable: string;
  if (/^<.*>$/.test(element)) variable = element.slice(1, -1);
  else if (/^-[^-]$/.test(element)) variable = element[1];
  else if (/^--.+$/.test(element)) variable = element.slice(2);
  else variable = element;
  variable = variable.replaceAll("-", "_");
  if (!isBashIdentifier(variable)) throw new MangleError(element);
  return variable;
}

function fail(message: string): number {
  writeSync(2, `${message}\n`);
  return 1;
}

function emit(text: string): number {
  writeSync(1, text);
  return 0;
}

function main(argv: string[]): number {
  let own: Map<string, Value>;
  try {
    own = docopt(DOC, argv, false, null, true);
  } catch (error) {
    if (!(error instanceof DocoptExit)) throw error;
    const { message } = error;
    if (message.startsWith("-h") || message.startsWith("--help")) return emit(`${DOC.trim()}\n`);
    if (message.startsWith("-V") || message.startsWith("--version")) return emit(`${VERSION.trim()}\n`);
    return fail(message);
  }

  let doc = own.get("--help") as string;
  let version = own.get("--version") as string | null;
  const separator = own.get("--separator") as string;
  if (doc === "-" && version === "-") {
    const [first, , second] = partition(readFileSync(0, "utf8"), separator);
    doc = first.trim();
    version = second.trim();
  } else if (doc === "-") {
    doc = readFileSync(0, "utf8").trim();
  } else if (version === "-") {
    version = readFileSync(0, "utf8").trim();
  }

  let args: Map<string, Value>;
  try {
    args = docopt(doc, own.get("<argv>") as string[], !own.get("--no-help"), version, Boolean(own.get("--options-first")));
  } catch (error) {
    if (error instanceof DocoptLanguageError) return fail(`docopts: invalid doc argument: ${error.message}`);
    if (error instanceof DocoptExit) return emit(`echo ${shellquote(error.message)} >&2\nexit 64\n`);
    if (error instanceof HelpExit) return emit(`echo -n ${shellquote(error.text)}\nexit 0\n`);
    throw error;
  }

  const lines: string[] = [];
  const name = own.get("-A") as string | null;
  if (name !== null) {
    if (!isBashIdentifier(name)) return fail(`docopts: not a valid Bash identifier: ${name}`);
    // Bash has no nested arrays, so a list becomes <name>,# and <name>,<i> keys.
    const entries = new Map<string, Value>(args);
    for (const [element, value] of args) {
      if (!Array.isArray(value)) continue;
      entries.delete(element);
      entries.set(`${element},#`, value.length);
      value.forEach((item, i) => entries.set(`${element},${i}`, item));
    }
    lines.push(`declare -A ${name}`);
    for (const [element, value] of entries) lines.push(`${name}[${shellquote(element)}]=${toBash(value)}`);
  } else {
    const variables = new Map<string, string>();
    let expected = 0;
    for (const [element, value] of args) {
      let variable: string | null;
      try {
        variable = nameMangle(element);
      } catch (error) {
        if (!(error instanceof MangleError)) throw error;
        return fail(`docopts: name could not be mangled into a valid Bash identifier: ${error.message}`);
      }
      if (variable === null) continue;
      expected++;
      variables.set(variable, toBash(value));
    }
    if (variables.size < expected) return fail("docopts: two or more elements have identically mangled names");
    for (const [variable, value] of variables) lines.push(`${variable}=${value}`);
  }
  return emit(lines.length ? `${lines.join("\n")}\n` : "");
}

process.exitCode = main(process.argv.slice(2));
