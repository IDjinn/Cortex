/**
 * Dependency-free syntax highlighter for code blocks.
 *
 * A single-pass line scanner (not a parser): per language it knows line/block
 * comment markers, string delimiters, triple-quoted blocks, keywords and
 * builtins. Multi-line states (block comments, triple quotes) carry across
 * lines so rendered rows stay aligned with the source. Designed to be cheap
 * enough to run on every stream delta of a code block.
 */

export type TokenType =
  | 'plain'
  | 'comment'
  | 'string'
  | 'number'
  | 'keyword'
  | 'builtin'
  | 'function'
  | 'property'
  | 'tag'
  | 'attribute';

export interface Token {
  text: string;
  type: TokenType;
}

interface LangDef {
  lineComment: string[];
  blockComment?: [string, string];
  strings: string[];
  tripleQuotes?: string[];
  keywords: Set<string>;
  builtins: Set<string>;
  caseInsensitive?: boolean;
  /** `"key": value` — a string followed by ':' is an object key. */
  json?: boolean;
  /** identifier before ':' is a property; '#hex' and '@at-rules' highlighted. */
  css?: boolean;
  /** `<tag attr="…">` mode. */
  markup?: boolean;
  /** `key:` before the value is a property. */
  yaml?: boolean;
}

function words(s: string): Set<string> {
  return new Set(s.split(' ').filter(Boolean));
}

// ---- Language families ----

const JS_KEYWORDS =
  'break case catch class const continue debugger default delete do else export extends finally for function if import in instanceof let new of return static super switch this throw try typeof var void while with yield async await from as get set';
const JS_BUILTINS =
  'console window document Math JSON Object Array String Number Boolean Promise Map Set Symbol Date RegExp Error globalThis process require module exports undefined null true false NaN Infinity setTimeout setInterval fetch localStorage';

const TS_EXTRA =
  'interface type enum namespace declare abstract implements private protected public readonly keyof infer satisfies override accessor is any unknown never';

const PY_KEYWORDS =
  'and as assert async await break case class continue def del elif else except finally for from global if import in is lambda match nonlocal not or pass raise return try while with yield';
const PY_BUILTINS =
  'self None True False print len range str int float list dict set tuple bool bytes enumerate zip map filter sum min max abs open input type isinstance issubclass super iter next getattr setattr hasattr __init__ __name__ __main__';

const CS_KEYWORDS =
  'abstract as async await base bool break byte case catch char checked class const continue decimal default delegate do double dynamic else enum event explicit extern false finally fixed float for foreach get goto if implicit in init int interface internal is lock long namespace new null object operator out override params partial private protected public readonly record ref return sbyte sealed set sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using value var virtual void volatile while yield required scoped';
const CS_BUILTINS =
  'Console Task List Dictionary HashSet Enumerable Guid DateTime TimeSpan Func Action IEnumerable DateTimeOffset';

const JAVA_KEYWORDS =
  'abstract assert boolean break byte case catch char class const default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public record return short static strictfp super switch synchronized this throw throws transient try var void volatile while yield sealed permit';
const JAVA_BUILTINS = 'System String Object Integer Long Double Boolean List Map Set ArrayList HashMap Math';

const CPP_KEYWORDS =
  'alignas alignof auto bool break case catch char class concept const consteval constexpr constinit const_cast continue co_await co_return co_yield decltype default delete do double dynamic_cast else enum explicit export extern false float for friend goto if inline int long mutable namespace new noexcept nullptr operator private protected public register reinterpret_cast requires return short signed sizeof static static_assert static_cast struct switch template this thread_local throw true try typedef typeid typename union unsigned using virtual void volatile wchar_t while';
const CPP_BUILTINS = 'std cout cin endl vector string map set unique_ptr shared_ptr make_unique make_shared size_t uint32_t int64_t';

const GO_KEYWORDS =
  'break case chan const continue default defer else fallthrough for func go goto if import interface map package range return select struct switch type var nil true false iota';
const GO_BUILTINS = 'append cap close copy delete len make new panic print println recover error string int int64 float64 bool byte rune fmt';

const RUST_KEYWORDS =
  'as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type union unsafe use where while';
const RUST_BUILTINS = 'println print vec String Vec Option Some None Result Ok Err Box Rc Arc HashMap HashSet unwrap expect';

const KOTLIN_KEYWORDS =
  'as break by catch class companion const continue crossinline data do dynamic else enum external false final finally for fun get if import in infix init inline interface internal is lateinit null object open operator out override package private protected public reified return sealed set super suspend tailrec this throw true try typealias val var vararg when where while';
const KOTLIN_BUILTINS = 'println print listOf mapOf mutableListOf let run apply also with takeIf takeUnless';

const SWIFT_KEYWORDS =
  'associatedtype break case catch class continue convenience default defer deinit didSet do dynamic else enum extension fallthrough false final for func get guard if import in indirect infix init inout internal is lazy let mutating nil open operator optional override postfix precedencegroup prefix private protocol public repeat required rethrows return self set some static struct subscript super switch throw throws true try unowned var weak where while willSet';
const SWIFT_BUILTINS = 'print String Int Double Bool Array Dictionary Set Optional Any NSObject';

const SQL_KEYWORDS =
  'add all alter and any as asc backup between by case check column constraint create cross database default delete desc distinct drop else end escape except exec exists foreign from full group having in index inner insert intersect into is join key left like limit not null offset on or order outer primary procedure references right rollback select set table then top transaction union unique update values view when where with commit begin';
const SQL_BUILTINS = 'count sum avg min max coalesce nullif cast convert now uuid varchar text int bigint boolean timestamp date';

const BASH_KEYWORDS =
  'if then else elif fi for while until do done case esac function in select time coproc local export readonly declare typeset unset return exit break continue eval exec source alias shift trap set';
const BASH_BUILTINS =
  'echo cd ls cat grep sed awk curl wget sudo apt apt-get git npm bun node yarn pnpm docker python pip pip3 java dotnet make mkdir rm rmdir cp mv touch chmod chown which env printf tar zip unzip ssh scp';

const RUBY_KEYWORDS =
  'alias and begin break case class def do else elsif end ensure for if in module next not or redo rescue retry return self super then undef unless until when while yield require require_relative attr_accessor attr_reader attr_writer';
const RUBY_BUILTINS = 'puts print p nil true false lambda proc';

const CLIKE_KEYWORDS =
  'abstract break case catch class const continue default delete do else enum export extends false final finally for function if implements import in instanceof interface let new null package private protected public return static super switch this throw throws true try typeof var void while with yield async await';

const LANG_DEFS: Record<string, LangDef> = {
  javascript: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
    keywords: words(JS_KEYWORDS),
    builtins: words(JS_BUILTINS),
  },
  typescript: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
    keywords: words(`${JS_KEYWORDS} ${TS_EXTRA}`),
    builtins: words(JS_BUILTINS),
  },
  json: {
    lineComment: [],
    strings: ['"'],
    keywords: new Set<string>(),
    builtins: words('true false null'),
    json: true,
  },
  python: {
    lineComment: ['#'],
    strings: ['"', "'"],
    tripleQuotes: ['"""', "'''"],
    keywords: words(PY_KEYWORDS),
    builtins: words(PY_BUILTINS),
  },
  csharp: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
    keywords: words(CS_KEYWORDS),
    builtins: words(CS_BUILTINS),
  },
  java: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"'],
    keywords: words(JAVA_KEYWORDS),
    builtins: words(JAVA_BUILTINS),
  },
  cpp: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
    keywords: words(CPP_KEYWORDS),
    builtins: words(CPP_BUILTINS),
  },
  go: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
    keywords: words(GO_KEYWORDS),
    builtins: words(GO_BUILTINS),
  },
  rust: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"'],
    keywords: words(RUST_KEYWORDS),
    builtins: words(RUST_BUILTINS),
  },
  kotlin: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"'],
    keywords: words(KOTLIN_KEYWORDS),
    builtins: words(KOTLIN_BUILTINS),
  },
  swift: {
    lineComment: ['//'],
    blockComment: ['/*', '*/'],
    strings: ['"'],
    keywords: words(SWIFT_KEYWORDS),
    builtins: words(SWIFT_BUILTINS),
  },
  sql: {
    lineComment: ['--'],
    blockComment: ['/*', '*/'],
    strings: ["'", '"'],
    keywords: words(SQL_KEYWORDS),
    builtins: words(SQL_BUILTINS),
    caseInsensitive: true,
  },
  bash: {
    lineComment: ['#'],
    strings: ['"', "'"],
    keywords: words(BASH_KEYWORDS),
    builtins: words(BASH_BUILTINS),
  },
  ruby: {
    lineComment: ['#'],
    strings: ['"', "'"],
    keywords: words(RUBY_KEYWORDS),
    builtins: words(RUBY_BUILTINS),
  },
  yaml: {
    lineComment: ['#'],
    strings: ['"', "'"],
    keywords: new Set<string>(),
    builtins: words('true false null yes no on off'),
    yaml: true,
  },
  css: {
    lineComment: [],
    blockComment: ['/*', '*/'],
    strings: ['"', "'"],
    keywords: words('important media supports keyframes import font-face root else and not only from to'),
    builtins: new Set<string>(),
    css: true,
  },
  markup: {
    lineComment: [],
    strings: ['"', "'"],
    keywords: new Set<string>(),
    builtins: new Set<string>(),
    markup: true,
  },
  clike: {
    lineComment: ['//', '#'],
    blockComment: ['/*', '*/'],
    strings: ['"', "'", '`'],
    keywords: words(CLIKE_KEYWORDS),
    builtins: new Set<string>(),
  },
};

/** alias (fence info string) → language family key */
const LANG_ALIASES: Record<string, string> = {
  javascript: 'javascript', js: 'javascript', jsx: 'javascript', mjs: 'javascript',
  cjs: 'javascript', node: 'javascript',
  typescript: 'typescript', ts: 'typescript', tsx: 'typescript',
  json: 'json', jsonc: 'json',
  python: 'python', py: 'python', python3: 'python',
  csharp: 'csharp', cs: 'csharp', 'c#': 'csharp',
  java: 'java',
  cpp: 'cpp', c: 'cpp', 'c++': 'cpp', h: 'cpp', hpp: 'cpp', cc: 'cpp',
  go: 'go', golang: 'go',
  rust: 'rust', rs: 'rust',
  kotlin: 'kotlin', kt: 'kotlin',
  swift: 'swift',
  sql: 'sql', mysql: 'sql', psql: 'sql', postgres: 'sql', postgresql: 'sql', sqlite: 'sql',
  bash: 'bash', sh: 'bash', shell: 'bash', zsh: 'bash', console: 'bash', terminal: 'bash',
  ruby: 'ruby', rb: 'ruby', rbw: 'ruby',
  yaml: 'yaml', yml: 'yaml',
  css: 'css', scss: 'css', sass: 'css', less: 'css',
  html: 'markup', xml: 'markup', svg: 'markup', vue: 'markup', svelte: 'markup',
  php: 'clike', dart: 'clike', scala: 'clike', perl: 'clike',
};

const PLAIN_DEF: LangDef = {
  // Unknown language: still highlight strings, numbers and # // comments.
  lineComment: ['#', '//'],
  strings: ['"', "'", '`'],
  keywords: new Set<string>(),
  builtins: new Set<string>(),
};

function resolveLang(alias: string | null | undefined): LangDef {
  if (!alias) return PLAIN_DEF;
  const key = LANG_ALIASES[alias.trim().toLowerCase()];
  return key ? LANG_DEFS[key] : PLAIN_DEF;
}

const IDENT_START = /[A-Za-z_$@]/;
const IDENT_CHAR = /[A-Za-z0-9_$]/;
const DIGIT = /[0-9]/;
const NUMBER_RE =
  /^(?:0[xX][0-9a-fA-F_]+|0[bB][01_]+|\d[\d_]*(?:\.\d+)?(?:[eE][+-]?\d+)?)([a-zA-Z%]+)?/;

/** Tokenizes `code` into per-line token rows for the given language alias. */
export function tokenize(code: string, alias?: string | null): Token[][] {
  const def = resolveLang(alias);
  const lines = code.split('\n');
  const out: Token[][] = [];

  // Multi-line state carried across lines.
  let inBlockComment = false;
  let triple: string | null = null;

  for (const line of lines) {
    if (def.markup) {
      out.push(tokenizeMarkup(line));
      continue;
    }

    const tokens: Token[] = [];
    let plain = '';
    const flush = () => {
      if (plain !== '') tokens.push({ text: plain, type: 'plain' });
      plain = '';
    };
    const push = (text: string, type: TokenType) => {
      flush();
      if (text !== '') tokens.push({ text, type });
    };

    const n = line.length;
    let i = 0;

    // Continuations of multi-line states from previous lines.
    if (inBlockComment && def.blockComment) {
      const close = def.blockComment[1];
      const end = line.indexOf(close);
      if (end < 0) {
        tokens.push({ text: line, type: 'comment' });
        out.push(tokens);
        continue;
      }
      tokens.push({ text: line.slice(0, end + close.length), type: 'comment' });
      i = end + close.length;
      inBlockComment = false;
    } else if (triple) {
      const end = line.indexOf(triple);
      if (end < 0) {
        tokens.push({ text: line, type: 'string' });
        out.push(tokens);
        continue;
      }
      tokens.push({ text: line.slice(0, end + triple.length), type: 'string' });
      i = end + triple.length;
      triple = null;
    }

    while (i < n) {
      const ch = line[i];

      // Whitespace rides along with plain text.
      if (ch === ' ' || ch === '\t') {
        plain += ch;
        i++;
        continue;
      }

      // Line comment — rest of the line.
      if (def.lineComment.some((c) => line.startsWith(c, i))) {
        push(line.slice(i), 'comment');
        break;
      }

      // Block comment (single line or opening a multi-line one).
      if (def.blockComment && line.startsWith(def.blockComment[0], i)) {
        const [open, close] = def.blockComment;
        const end = line.indexOf(close, i + open.length);
        if (end < 0) {
          push(line.slice(i), 'comment');
          inBlockComment = true;
          break;
        }
        push(line.slice(i, end + close.length), 'comment');
        i = end + close.length;
        continue;
      }

      // Triple-quoted string (python docstrings).
      if (def.tripleQuotes) {
        const t = def.tripleQuotes.find((q) => line.startsWith(q, i));
        if (t) {
          const end = line.indexOf(t, i + t.length);
          if (end < 0) {
            push(line.slice(i), 'string');
            triple = t;
            break;
          }
          push(line.slice(i, end + t.length), 'string');
          i = end + t.length;
          continue;
        }
      }

      // Quoted string (backslash escapes; unterminated colors to end of line).
      if (def.strings.includes(ch)) {
        let j = i + 1;
        while (j < n) {
          if (line[j] === '\\') {
            j += 2;
            continue;
          }
          if (line[j] === ch) {
            j++;
            break;
          }
          j++;
        }
        const end = Math.min(j, n);
        let type: TokenType = 'string';
        if (def.json) {
          let k = end;
          while (k < n && (line[k] === ' ' || line[k] === '\t')) k++;
          if (line[k] === ':') type = 'property'; // object key
        }
        push(line.slice(i, end), type);
        i = end;
        continue;
      }

      // Numbers (dec/hex/bin, CSS units like 12px, 1.5em).
      if (DIGIT.test(ch)) {
        const m = line.slice(i).match(NUMBER_RE);
        if (m) {
          push(m[0], 'number');
          i += m[0].length;
          continue;
        }
      }

      // CSS hex colors (#0B0B0D) — before identifiers so '#' isn't lost.
      if (def.css && ch === '#' && /[0-9a-fA-F]/.test(line[i + 1] ?? '')) {
        const m = line.slice(i).match(/^#[0-9a-fA-F]{3,8}\b/);
        if (m) {
          push(m[0], 'number');
          i += m[0].length;
          continue;
        }
      }

      // Identifiers / keywords / calls.
      if (IDENT_START.test(ch)) {
        let j = i + 1;
        while (j < n && IDENT_CHAR.test(line[j])) j++;
        const word = line.slice(i, j);

        if (ch === '@' && word.length > 1) {
          // Decorators (@Component, @app.route) — also covers CSS at-rules.
          push(word, 'builtin');
          i = j;
          continue;
        }

        if (def.yaml || def.css) {
          let k = j;
          while (k < n && (line[k] === ' ' || line[k] === '\t')) k++;
          if (line[k] === ':' && !isKeyword(def, word)) {
            // property: value
            push(word, 'property');
            i = j;
            continue;
          }
        }

        if (isKeyword(def, word)) {
          push(word, 'keyword');
        } else if (def.builtins.has(word)) {
          push(word, 'builtin');
        } else if (line[j] === '(' || (line[j] === ' ' && line[j + 1] === '(')) {
          // Call site: identifier immediately (or one space) before '('.
          push(word, 'function');
        } else {
          plain += word;
        }
        i = j;
        continue;
      }

      plain += ch;
      i++;
    }

    flush();
    out.push(tokens);
  }

  return out;
}

function isKeyword(def: LangDef, word: string): boolean {
  return def.caseInsensitive ? def.keywords.has(word.toLowerCase()) : def.keywords.has(word);
}

/** `<tag attr="…">` scanner: tag names, attribute names, attribute values. */
function tokenizeMarkup(line: string): Token[] {
  const tokens: Token[] = [];
  let plain = '';
  const flush = () => {
    if (plain !== '') tokens.push({ text: plain, type: 'plain' });
    plain = '';
  };
  const push = (text: string, type: TokenType) => {
    flush();
    if (text !== '') tokens.push({ text, type });
  };

  let i = 0;
  const n = line.length;
  while (i < n) {
    if (line.startsWith('<!--', i)) {
      const end = line.indexOf('-->', i + 4);
      const stop = end < 0 ? n : end + 3;
      push(line.slice(i, stop), 'comment');
      i = stop;
      continue;
    }
    if (line[i] === '<') {
      let j = i + 1;
      if (line[j] === '/') j++;
      const nameStart = j;
      while (j < n && /[A-Za-z0-9:_.-]/.test(line[j])) j++;
      if (j > nameStart) {
        push(line.slice(i, j), 'tag');
        i = j;
        // Attributes until the closing '>'.
        while (i < n && line[i] !== '>') {
          const c = line[i];
          if (c === ' ' || c === '\t' || c === '/') {
            plain += c;
            i++;
          } else if (c === '"' || c === "'") {
            let k = i + 1;
            while (k < n && line[k] !== c) k++;
            push(line.slice(i, Math.min(k + 1, n)), 'string');
            i = Math.min(k + 1, n);
          } else if (/[A-Za-z_:]/.test(c)) {
            let k = i;
            while (k < n && /[A-Za-z0-9_:.-]/.test(line[k])) k++;
            push(line.slice(i, k), 'attribute');
            i = k;
          } else {
            plain += c;
            i++;
          }
        }
        if (i < n) {
          plain += '>';
          i++;
        }
        continue;
      }
    }
    plain += line[i];
    i++;
  }
  flush();
  return tokens;
}
