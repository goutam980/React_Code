// // let firstName: string = "Goutam";
// // let lastName: string = "Tiwari"; // 
// // console.log("Hello", firstName)

// // function greet(firstName) {
// //     console.log("hello" + firstName);
// // }

// // function sum2(a: number, b: number) {
// //     return (a + b)
// // }

// // let a = sum2(2, 2)
// // console.log(a)






// // function sum(a: number, b: number): number {

// // }

// // interface User {
// //     name: string,
// //     age: number,
// //     address: {
// //         city: 
// //     }
// // }

// // Union vs intersaction 
// type GoodUser = {
//     name: string,
//     gift: string

// }
// type BadUser = {
//     name: string,
//     loan: string
// }

// type User = GoodUser | BadUser;
// const user: User = {
//     name: "naman",
//     loan: "1000000"
// }
// console.log(user)

function getMax(nums: number[]) {
    let maxValue = -10000000;
    for (let i = 0; i < nums.length; i++) {
        if (nums[i] > maxValue) {
            maxValue = nums[i]
        }
    }
    return maxValue
}
const value = getMax([1, 2, 3, 4, 5, 6, 7, 67, 88, 3, 1, 1, 1, 2, 2, 3, 3, 4,])
console.log(value)
console.log("he this is the new world")