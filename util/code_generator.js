// an array full of ASCII upper case and number codes
const CHAR_CODES = generate_array(65, 90).concat(generate_array(48, 57));

module.exports = () => {
  // puts together an array of randomly generated characters from CHAR_CODES
  const code = [];
  for (let i = 0; i < 5; i++) {
    const random_value =
      CHAR_CODES[Math.floor(Math.random() * CHAR_CODES.length)];
    code.push(String.fromCharCode(random_value));
  }

  // .join concatenates everything in the array to make a new string
  return code.join("");
};

// creates an array of numbers starting at the low and ending at the high
// this is only here because I'm lazy and dont want to type the array out myself
function generate_array(low, high) {
  const array = [];
  for (let i = low; i <= high; i++) array.push(i);
  return array;
}

// Arrow notation could be used for generate_array as long as it is moved above CHAR_CODES.
// I just thought keeping generate_array at the bottom looked cleaner
