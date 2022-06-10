import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react'
import { toast } from 'react-toastify'
import { api } from '../services/api'
import { Product, Stock } from '../types'

interface CartProviderProps {
  children: ReactNode
}

interface UpdateProductAmount {
  productId: number
  amount: number
}

interface CartContextData {
  cart: Product[]
  addProduct: (productId: number) => Promise<void>
  removeProduct: (productId: number) => void
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void
}

const CartContext = createContext<CartContextData>({} as CartContextData)

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    /* 
    Criado a var 'storagedCart' que vai até o localStorage, e pode ser uma string ou null, por isso o if em seguida;
    Se ela for null, retorna um array vazio;
    Se não for, retornamos o valor. Como o carrinho não é uma string, fazemos um JSON.parse
    para transformar no valor original
    */

    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart)
    }

    return []
  })

  const prevCartRef = useRef<Product[]>()

  useEffect(() => {
    prevCartRef.current = cart
  })

  const cartPreviousValue = prevCartRef.current ?? cart

  useEffect(() => {
    if (cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart))
    }
  }, [cart, cartPreviousValue])

  const addProduct = async (productId: number) => {
    try {
      /* 
      Verificar se o produto já está no carrinho para então adicionar o produto ou somente aumentar a quantidade;
      Verificar a quantidade no estoque */
      const updatedCart = [...cart]
      const productExists = updatedCart.find(
        product => product.id === productId
      )

      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount /* data vem da API */
      const currentAmount = productExists ? productExists.amount : 0
      const amount = currentAmount + 1

      if (amount > stockAmount) {
        // Comparar qntd desejada com estoque
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      if (productExists) {
        productExists.amount = amount
      } else {
        // Se não for um produto novo, buscar ele na API
        const product = await api.get(`/products/${productId}`)

        const newProduct = { ...product.data, amount: 1 }
        updatedCart.push(newProduct) // Como não está adicionando ao cart propriamente, não quebra a imutabilidade
      }

      setCart(updatedCart)
    } catch {
      toast.error('Erro na adição do produto')
    }
  }

  const removeProduct = (productId: number) => {
    try {
      const updatedCart = [...cart]
      const productIndex = updatedCart.findIndex(
        product => product.id === productId
      )

      if (productIndex >= 0) {
        updatedCart.splice(productIndex, 1) // Remove o item identificado
        setCart(updatedCart) // Atualiza com a nova lista
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na remoção do produto')
    }
  }

  const updateProductAmount = async ({
    productId,
    amount
  }: UpdateProductAmount) => {
    try {
      if (amount <= 0) {
        return
      }

      const stock = await api.get(`/stock/${productId}`)
      const stockAmount = stock.data.amount
      if (amount > stockAmount) {
        toast.error('Quantidade solicitada fora de estoque')
        return
      }

      const updatedCart = [...cart]
      const productExists = updatedCart.find(
        product => product.id === productId
      )
      if (productExists) {
        productExists.amount = amount
        setCart(updatedCart)
      } else {
        throw Error()
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  }

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart(): CartContextData {
  const context = useContext(CartContext)

  return context
}
