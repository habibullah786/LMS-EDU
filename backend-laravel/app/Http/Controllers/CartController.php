<?php

namespace App\Http\Controllers;

use App\Models\Cart;
use App\Models\CartItem;
use App\Models\CourseClass;
use App\Models\EnrollmentStudent;
use App\Models\Student;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Database\QueryException;

class CartController extends Controller
{
    /**
     * View the current parent's open cart.
     */
    public function show(): JsonResponse
    {
        $cart = $this->openCartFor(auth()->id());

        return response()->json([
            'success' => true,
            'data' => $this->formatCart($cart),
        ]);
    }

    /**
     * Add a student + class to the cart.
     *
     * This is a fast, non-locking check — it's a courtesy to fail early with
     * a clear error. The authoritative seat/duplicate check happens again
     * (with a row lock) at checkout, since seats can change between add and
     * checkout.
     */
    public function addItem(Request $request): JsonResponse
    {
        $data = $request->validate([
            'student_id' => 'required|integer|exists:students,id',
            'class_id' => 'required|integer|exists:classes,id',
        ]);

        $student = Student::where('id', $data['student_id'])
            ->where('user_id', auth()->id())
            ->first();

        if (!$student) {
            return response()->json([
                'success' => false,
                'message' => 'Student not found.',
            ], 404);
        }

        $class = CourseClass::with('course')->findOrFail($data['class_id']);

        if (!$class->hasAvailableSeats()) {
            return response()->json([
                'success' => false,
                'error' => 'class_full',
                'message' => 'This class has no seats remaining.',
            ], 409);
        }

        $alreadyEnrolled = EnrollmentStudent::where('student_id', $student->id)
            ->where('class_id', (string) $class->id)
            ->exists();

        if ($alreadyEnrolled) {
            return response()->json([
                'success' => false,
                'error' => 'duplicate_enrollment',
                'message' => "{$student->name} is already enrolled in this class.",
            ], 409);
        }

        $cart = $this->openCartFor(auth()->id());

        $item = CartItem::firstOrCreate(
            [
                'cart_id' => $cart->id,
                'student_id' => $student->id,
                'class_id' => $class->id,
            ],
            ['price_snapshot' => $class->course->price],
        );

        return response()->json([
            'success' => true,
            'data' => $this->formatCartItem($item->fresh(['student', 'courseClass.course'])),
        ], 201);
    }

    /**
     * Remove an item from the current parent's cart.
     */
    public function removeItem($id): JsonResponse
    {
        $cart = $this->openCartFor(auth()->id());

        $item = CartItem::where('cart_id', $cart->id)->where('id', $id)->first();

        if (!$item) {
            return response()->json([
                'success' => false,
                'message' => 'Cart item not found.',
            ], 404);
        }

        $item->delete();

        return response()->json([
            'success' => true,
            'message' => 'Removed from cart.',
        ]);
    }

    private function openCartFor(int $userId): Cart
    {
        try {
            return Cart::firstOrCreate(['user_id' => $userId, 'status' => 'open']);
        } catch (QueryException $e) {
            $cart = Cart::where('user_id', $userId)->where('status', 'open')->first();
            if ($cart) return $cart;
            throw $e;
        }
    }

    private function formatCart(Cart $cart): array
    {
        $items = $cart->items()->with(['student', 'courseClass.course'])->get();

        return [
            'id' => $cart->id,
            'items' => $items->map(fn ($item) => $this->formatCartItem($item))->values(),
            'total' => $items->sum('price_snapshot'),
        ];
    }

    private function formatCartItem(CartItem $item): array
    {
        return [
            'id' => $item->id,
            'student' => [
                'id' => $item->student->id,
                'name' => $item->student->name,
            ],
            'class' => [
                'id' => $item->courseClass->id,
                'course' => $item->courseClass->course->name,
                'location' => $item->courseClass->location,
                'start_datetime' => $item->courseClass->start_datetime,
                'available_seats' => $item->courseClass->available_seats,
            ],
            'price_snapshot' => $item->price_snapshot,
        ];
    }
}
